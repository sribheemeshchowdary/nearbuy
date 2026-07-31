import { useState } from "react";
import { Star, ThumbsUp, MessageSquare, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export interface Review {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  date: string;
  helpful: number;
}

interface ReviewSectionProps {
  businessId: string;
  reviews: Review[];
  onAddReview?: (review: Omit<Review, "id" | "helpful">) => void;
}

const StarRating = ({
  rating,
  interactive,
  onRate,
  size = "sm",
}: {
  rating: number;
  interactive?: boolean;
  onRate?: (r: number) => void;
  size?: "sm" | "md";
}) => {
  const s = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${s} ${
            i <= rating ? "text-warning fill-warning" : "text-muted-foreground/30"
          } ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
          onClick={() => interactive && onRate?.(i)}
        />
      ))}
    </div>
  );
};

const ReviewSection = ({ businessId, reviews: propReviews, onAddReview }: ReviewSectionProps) => {
  const reviews = propReviews.filter(Boolean);
  const [showForm, setShowForm] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");

  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const handleSubmit = () => {
    if (newRating === 0) {
      toast.error("Please select a rating");
      return;
    }
    if (!newComment.trim()) {
      toast.error("Please write a review");
      return;
    }
    onAddReview?.({
      authorName: "You",
      rating: newRating,
      comment: newComment,
      date: new Date().toISOString().split("T")[0],
    });
    toast.success("Review submitted!");
    setShowForm(false);
    setNewRating(0);
    setNewComment("");
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-bold text-foreground">{avgRating.toFixed(1)}</div>
          <div>
            <StarRating rating={Math.round(avgRating)} size="md" />
            <p className="text-sm text-muted-foreground mt-0.5">{reviews.length} reviews</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <MessageSquare className="w-4 h-4 mr-1.5" />
          Write Review
        </Button>
      </div>

      {/* Write review form */}
      {showForm && (
        <div className="bg-secondary/50 rounded-xl p-4 space-y-3 animate-fade-in">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Your Rating</p>
            <StarRating rating={newRating} interactive onRate={setNewRating} size="md" />
          </div>
          <Textarea
            placeholder="Share your experience..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit}>Submit</Button>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Reviews list */}
      <div className="space-y-4">
        {reviews.length === 0 && (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        )}
        {reviews.map((review) => (
          <div key={review.id} className="border-b border-border/50 pb-4 last:border-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{review.authorName}</p>
                <div className="flex items-center gap-2">
                  <StarRating rating={review.rating} />
                  <span className="text-xs text-muted-foreground">{review.date}</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground ml-11">{review.comment}</p>
            <div className="ml-11 mt-2">
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                <ThumbsUp className="w-3 h-3" />
                Helpful ({review.helpful})
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewSection;
export { StarRating };
