export type DemoEnquiryStatus = "unread" | "read" | "replied";

export interface DemoEnquiry {
  id: string;
  listingId: string;
  listingName: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: DemoEnquiryStatus;
  reply?: string;
  createdAt: { seconds: number };
  repliedAt?: { seconds: number };
}

const now = Math.floor(Date.now() / 1000);

export const DEMO_ENQUIRIES: DemoEnquiry[] = [
  {
    id: "demo-enquiry-1",
    listingId: "demo-1",
    listingName: "MathWhiz Tuition Centre",
    name: "Amanda Lee",
    email: "amanda.lee@example.com",
    phone: "+65 9123 4567",
    message: "Hi, do you have a Primary 6 Math class on weekends? I would also like to know the class size and monthly fees.",
    status: "unread",
    createdAt: { seconds: now - 18 * 60 },
  },
  {
    id: "demo-enquiry-2",
    listingId: "demo-2",
    listingName: "BrightStar Learning Hub",
    name: "Mohamed Irfan",
    email: "irfan@example.com",
    phone: "+65 9234 5678",
    message: "Is there a trial lesson available for Secondary 2 Science next week?",
    status: "unread",
    createdAt: { seconds: now - 2 * 60 * 60 },
  },
  {
    id: "demo-enquiry-3",
    listingId: "demo-3",
    listingName: "AcePro Tuition",
    name: "Cheryl Tan",
    email: "cheryl.tan@example.com",
    message: "Could you share the schedule for the upcoming H2 Physics revision programme?",
    status: "read",
    createdAt: { seconds: now - 26 * 60 * 60 },
  },
  {
    id: "demo-enquiry-4",
    listingId: "demo-1",
    listingName: "MathWhiz Tuition Centre",
    name: "David Lim",
    email: "david.lim@example.com",
    phone: "+65 9345 6789",
    message: "Thank you for the information. Please reserve a place for the Saturday class.",
    status: "replied",
    reply: "Thanks, David. We have reserved a place and will send the registration details shortly.",
    createdAt: { seconds: now - 3 * 24 * 60 * 60 },
    repliedAt: { seconds: now - 2 * 24 * 60 * 60 },
  },
];

