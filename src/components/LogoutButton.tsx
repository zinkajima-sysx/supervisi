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
    <button className={className ?? "button button--ghost button--sm"} onClick={() => signOut()}>
      {children ?? "Logout"}
    </button>
  );
}
