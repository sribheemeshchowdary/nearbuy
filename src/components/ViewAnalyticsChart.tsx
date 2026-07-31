import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Eye, Calendar } from "lucide-react";
import type { Listing } from "@/components/ListingCard";

interface ViewAnalyticsChartProps {
  listings: Listing[];
  userId: string;
}

type Period = "7d" | "30d";

interface ViewLog {
  listingId: string;
  timestamp: Timestamp;
}

const ViewAnalyticsChart = ({ listings, userId }: ViewAnalyticsChartProps) => {
  const [period, setPeriod] = useState<Period>("7d");
  const [selectedListing, setSelectedListing] = useState("all");
  const [viewLogs, setViewLogs] = useState<ViewLog[]>([]);
  const [loading, setLoading] = useState(true);

  const approvedListings = useMemo(() => listings.filter(l => l.status === "approved"), [listings]);

  useEffect(() => {
    const fetchViewLogs = async () => {
      if (!userId || approvedListings.length === 0) {
        setLoading(false);
        return;
      }
      try {
        const daysBack = period === "7d" ? 7 : 30;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysBack);

        const listingIds = approvedListings.map(l => l.id);
        // Firestore `in` queries limited to 30 items — fine for most owners
        const q = query(
          collection(db, "view_logs"),
          where("listingId", "in", listingIds.slice(0, 30)),
          where("timestamp", ">=", Timestamp.fromDate(cutoff))
        );
        const snap = await getDocs(q);
        setViewLogs(snap.docs.map(d => d.data() as ViewLog));
      } catch {
        // If collection doesn't exist yet, show empty chart
        setViewLogs([]);
      }
      setLoading(false);
    };
    fetchViewLogs();
  }, [userId, period, approvedListings]);

  const chartData = useMemo(() => {
    const daysBack = period === "7d" ? 7 : 30;
    const days: { date: string; views: number; label: string }[] = [];

    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-SG", { day: "numeric", month: "short" });

      const count = viewLogs.filter(v => {
        if (selectedListing !== "all" && v.listingId !== selectedListing) return false;
        const vDate = v.timestamp?.toDate?.()?.toISOString().slice(0, 10);
        return vDate === dateKey;
      }).length;

      days.push({ date: dateKey, views: count, label });
    }
    return days;
  }, [viewLogs, period, selectedListing]);

  const totalPeriodViews = useMemo(() => chartData.reduce((a, b) => a + b.views, 0), [chartData]);

  if (approvedListings.length === 0) {
    return null;
  }

  return (
    <div className="bg-background rounded-2xl border border-border p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          View Trends
        </h3>
        <div className="flex items-center gap-2">
          <Select value={selectedListing} onValueChange={setSelectedListing}>
            <SelectTrigger className="h-8 text-xs w-[160px]">
              <SelectValue placeholder="All listings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Listings</SelectItem>
              {approvedListings.map(l => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setPeriod("7d")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                period === "7d" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-secondary"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setPeriod("30d")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                period === "30d" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-secondary"
              }`}
            >
              30 Days
            </button>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="flex items-center gap-6">
        <div>
          <p className="text-2xl font-bold text-foreground">{totalPeriodViews.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Total views ({period === "7d" ? "7 days" : "30 days"})
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">
            {chartData.length > 0 ? Math.round(totalPeriodViews / chartData.length) : 0}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Avg per day
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[220px]">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground animate-pulse">Loading chart...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="viewGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval={period === "30d" ? 4 : 0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                labelStyle={{ fontWeight: 600, color: "hsl(var(--foreground))" }}
                formatter={(value: number) => [`${value} views`, "Views"]}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#viewGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        View data is recorded each time someone visits your business page.
      </p>
    </div>
  );
};

export default ViewAnalyticsChart;
