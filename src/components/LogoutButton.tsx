"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button className={className ?? "btn btn-ghost btn-sm"} onClick={() => signOut()}>
      {children ?? "Logout"}
    </button>
  );
}
