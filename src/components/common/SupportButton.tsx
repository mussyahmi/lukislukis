"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SupportButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-primary hover:underline font-medium cursor-pointer"
      >
        Belanja Kopi
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Belanja Kopi</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground text-center sm:text-left">
            Terima kasih kerana menyokong LukisLukis! Imbas mana-mana kod QR di bawah.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* DuitNow */}
            <div className="flex flex-col items-center gap-2 border rounded-xl p-3">
              <p className="text-xs font-semibold">DuitNow QR</p>
              <div className="relative w-48 sm:w-full aspect-square">
                <Image src="/duitnow-qr.png" alt="DuitNow QR" fill className="object-contain rounded-lg" />
              </div>
              <p className="text-[10px] text-muted-foreground text-center">Mana-mana aplikasi bank</p>
            </div>

            {/* Buy Me a Coffee */}
            <div className="flex flex-col items-center gap-2 border rounded-xl p-3">
              <p className="text-xs font-semibold">Buy Me a Coffee</p>
              <div className="relative w-48 sm:w-full aspect-square">
                <Image src="/buymeacoffee-qr.png" alt="Buy Me a Coffee QR" fill className="object-contain rounded-lg" />
              </div>
              <p className="text-[10px] text-muted-foreground text-center">Imbas atau klik <a href="https://buymeacoffee.com/mustafasyahmi" target="_blank" rel="noopener noreferrer" className="text-primary underline">di sini</a></p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
