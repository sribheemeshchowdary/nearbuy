import { useEffect, useState } from "react";
import {
  doc, updateDoc, increment, onSnapshot, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs, addDoc, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Tracks page views (persistent counter) and live viewers (real-time presence)
 * for a given listing. Automatically registers/unregisters the current viewer.
 */
export const useViewTracking = (listingId: string | undefined) => {
  const [viewCount, setViewCount] = useState(0);
  const [liveViewers, setLiveViewers] = useState(0);

  useEffect(() => {
    if (!listingId) return;

    // 1. Increment persistent view count + log for analytics
    const listingRef = doc(db, "listings", listingId);
    updateDoc(listingRef, { viewCount: increment(1) }).catch(() => {});
    addDoc(collection(db, "view_logs"), {
      listingId,
      timestamp: Timestamp.now(),
    }).catch(() => {});

    // 2. Listen to view count in real-time
    const unsubListing = onSnapshot(listingRef, (snap) => {
      if (snap.exists()) {
        setViewCount(snap.data()?.viewCount || 0);
      }
    });

    // 3. Register as active viewer
    const viewerId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const viewerRef = doc(db, "listing_viewers", `${listingId}_${viewerId}`);
    setDoc(viewerRef, {
      listingId,
      viewerId,
      lastSeen: serverTimestamp(),
    }).catch(() => {});

    // Heartbeat every 30s
    const heartbeat = setInterval(() => {
      setDoc(viewerRef, {
        listingId,
        viewerId,
        lastSeen: serverTimestamp(),
      }, { merge: true }).catch(() => {});
    }, 30000);

    // 4. Listen to active viewers for this listing
    const viewersQuery = query(
      collection(db, "listing_viewers"),
      where("listingId", "==", listingId)
    );
    const unsubViewers = onSnapshot(viewersQuery, (snap) => {
      // Only count viewers with lastSeen within the last 60 seconds
      const now = Date.now();
      const active = snap.docs.filter((d) => {
        const lastSeen = d.data().lastSeen?.toMillis?.() || 0;
        return now - lastSeen < 60000;
      });
      setLiveViewers(active.length);
    });

    // Cleanup
    return () => {
      clearInterval(heartbeat);
      deleteDoc(viewerRef).catch(() => {});
      unsubListing();
      unsubViewers();
    };
  }, [listingId]);

  return { viewCount, liveViewers };
};

/**
 * Fetches view counts for multiple listings (for dashboard/admin use).
 * Returns a map of listingId → viewCount.
 */
export const useListingViewCounts = (listingIds: string[]) => {
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (listingIds.length === 0) return;

    // Listen to each listing doc for real-time view count updates
    const unsubs = listingIds.map((id) => {
      return onSnapshot(doc(db, "listings", id), (snap) => {
        if (snap.exists()) {
          setViewCounts((prev) => ({
            ...prev,
            [id]: snap.data()?.viewCount || 0,
          }));
        }
      });
    });

    return () => unsubs.forEach((u) => u());
  }, [listingIds.join(",")]);

  return viewCounts;
};
