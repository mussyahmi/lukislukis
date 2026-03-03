"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function FeedbackButton() {
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowFeedbackDialog(true)}
        title="Beri Maklum Balas"
        className="text-primary hover:underline font-medium cursor-pointer"
      >
        Beri Maklum Balas
      </button>

      {/* Dialog Maklum Balas */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kongsi Maklum Balas Anda</DialogTitle>
            <DialogDescription>
              Bantu kami menambah baik LukisLukis! Maklum balas dan cadangan anda
              amat kami hargai. Klik butang di bawah untuk membuka papan maklum
              balas di mana anda boleh berkongsi pendapat, melaporkan isu,
              atau mencadangkan ciri baharu.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end space-x-2">
            <DialogClose asChild>
              <Button variant="outline">Batal</Button>
            </DialogClose>
            <Button
              onClick={() => {
                window.open("https://insigh.to/b/lukislukis", "_blank");
                setShowFeedbackDialog(false);
              }}
            >
              Buka Papan Maklum Balas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}