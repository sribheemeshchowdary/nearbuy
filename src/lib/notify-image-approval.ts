import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  imageApprovedSubject, imageApprovedHtml, type ImageApprovedData,
  imageRejectedSubject, imageRejectedHtml, type ImageRejectedData,
} from "@/lib/email-templates";

export type ImageNotificationType = "image_approved" | "image_rejected";

interface NotifyImageApprovalParams {
  type: ImageNotificationType;
  recipientEmail: string;
  recipientName?: string;
  businessName: string;
  imageType: "logo" | "photos";
  listingId: string;
  ownerId: string;
}

/**
 * Saves a notification record to Firestore's `notifications` collection.
 * The email HTML is pre-rendered and stored so a Cloud Function (or manual process)
 * can pick it up and send it.
 */
export const notifyImageApproval = async (params: NotifyImageApprovalParams) => {
  const dashboardUrl = `${window.location.origin}/business-dashboard`;

  let subject: string;
  let html: string;

  if (params.type === "image_approved") {
    const data: ImageApprovedData = {
      businessName: params.businessName,
      ownerName: params.recipientName,
      imageType: params.imageType,
      dashboardUrl,
    };
    subject = imageApprovedSubject(data);
    html = imageApprovedHtml(data);
  } else {
    const data: ImageRejectedData = {
      businessName: params.businessName,
      ownerName: params.recipientName,
      imageType: params.imageType,
      dashboardUrl,
    };
    subject = imageRejectedSubject(data);
    html = imageRejectedHtml(data);
  }

  await addDoc(collection(db, "notifications"), {
    type: params.type,
    recipientEmail: params.recipientEmail,
    recipientId: params.ownerId,
    listingId: params.listingId,
    imageType: params.imageType,
    subject,
    html,
    read: false,
    sent: false,
    createdAt: serverTimestamp(),
  });
};
