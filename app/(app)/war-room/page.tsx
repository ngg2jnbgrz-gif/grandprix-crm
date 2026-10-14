import { WarRoom } from "./_components/war-room";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "War Room",
};

/**
 * War Room: Iron-Man/Tron-style command interface for the Patchogue Flooring
 * lead campaign. Static campaign data (lib/war-room-data.ts); hot-lead
 * outcomes persist to localStorage on the device.
 */
export default function WarRoomPage() {
  return <WarRoom />;
}
