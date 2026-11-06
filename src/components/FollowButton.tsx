"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function FollowButton({
  organizerId, initialFollowing
}: { organizerId: string; initialFollowing: boolean }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, start] = useTransition();
  const router = useRouter();

  function toggle() {
    start(async () => {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetUserId: organizerId, action: following ? "unfollow" : "follow" })
      });
      if (res.ok) { setFollowing(!following); router.refresh(); }
    });
  }

  return (
    <button onClick={toggle} disabled={pending}
      className={`btn ${following ? "btn-ghost" : "btn-primary"}`}>
      {pending ? "…" : following ? "Following" : "Follow"}
    </button>
  );
}
