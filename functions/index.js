const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Scheduled function to clean up anonymous users older than 24 hours
 * Runs daily at midnight (Kuala Lumpur time)
 */
const STALE_PLAYER_THRESHOLD = 30 * 60 * 1000; // 30 minutes
const INACTIVE_ROOM_THRESHOLD = 60 * 60 * 1000; // 1 hour

exports.cleanupStaleRooms = functions.scheduler.onSchedule({
  schedule: 'every 6 hours',
  timeZone: 'Asia/Kuala_Lumpur',
  memory: '128MiB',
  timeoutSeconds: 60,
}, async () => {
  const db = admin.database();
  const now = Date.now();

  console.log('🧹 Starting stale room cleanup...');

  try {
    const snapshot = await db.ref('rooms').get();

    if (!snapshot.exists()) {
      console.log('No rooms found.');
      return;
    }

    const rooms = snapshot.val();
    const deletePromises = [];

    Object.values(rooms).forEach((room) => {
      const players = room.players ? Object.values(room.players) : [];

      const isEmpty = players.length === 0 && now - room.createdAt > INACTIVE_ROOM_THRESHOLD;
      const allInactive = players.length > 0 && players.every(p => now - p.lastActive > STALE_PLAYER_THRESHOLD);
      const roomInactive = room.lastActivity && now - room.lastActivity > INACTIVE_ROOM_THRESHOLD;

      if (isEmpty || allInactive || roomInactive) {
        console.log(`🗑️  Deleting room: ${room.roomCode} (reason: ${isEmpty ? 'empty' : allInactive ? 'all players inactive' : 'room inactive'})`);
        deletePromises.push(db.ref(`rooms/${room.roomCode}`).remove());
      }
    });

    await Promise.all(deletePromises);
    console.log(`✅ Room cleanup complete. Deleted: ${deletePromises.length} room(s).`);

  } catch (error) {
    console.error('❌ Room cleanup failed:', error);
    throw error;
  }
});

exports.cleanupOldAnonymousUsers = functions.scheduler.onSchedule({
  schedule: 'every 24 hours',
  timeZone: 'Asia/Kuala_Lumpur',
  memory: '128MiB',
  timeoutSeconds: 60,
}, async (event) => {
  const auth = admin.auth();
  const now = Date.now();
  const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);

  let nextPageToken;
  let deletedCount = 0;
  let checkedCount = 0;

  console.log('🧹 Starting daily anonymous user cleanup...');
  console.log(`⏰ Current time: ${new Date(now).toISOString()}`);
  console.log(`🗑️  Deleting users inactive since: ${new Date(twentyFourHoursAgo).toISOString()}`);

  try {
    do {
      // List users in batches of 1000
      const listResult = await auth.listUsers(1000, nextPageToken);
      checkedCount += listResult.users.length;

      // Filter and delete old anonymous users
      const deletePromises = listResult.users
        .filter(user => {
          // Check if user is anonymous (no provider data)
          const isAnonymous = !user.providerData || user.providerData.length === 0;

          if (!isAnonymous) return false;

          // Get last activity time
          const createdAt = new Date(user.metadata.creationTime).getTime();
          const lastSignIn = new Date(user.metadata.lastSignInTime).getTime();
          const lastActivity = Math.max(createdAt, lastSignIn);

          // Delete if inactive for 24+ hours
          return lastActivity < twentyFourHoursAgo;
        })
        .map(user => {
          deletedCount++;
          console.log(`🗑️  Deleting user: ${user.uid} (last active: ${user.metadata.lastSignInTime})`);
          return auth.deleteUser(user.uid);
        });

      // Execute deletions in parallel
      await Promise.all(deletePromises);

      // Move to next page
      nextPageToken = listResult.pageToken;

    } while (nextPageToken);

    // Log summary
    console.log('✅ Cleanup complete!');
    console.log(`📊 Total users checked: ${checkedCount}`);
    console.log(`🗑️  Anonymous users deleted: ${deletedCount}`);
    console.log(`👥 Users remaining: ${checkedCount - deletedCount}`);

    return {
      success: true,
      checked: checkedCount,
      deleted: deletedCount,
      remaining: checkedCount - deletedCount
    };

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
});