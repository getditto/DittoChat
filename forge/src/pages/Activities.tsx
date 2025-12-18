import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ActivityCard } from "@/components/ActivityCard";
import { activities, categories } from "@/data/activities";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function Activities() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch = activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || activity.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <section className="pt-24 pb-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 animate-fade-in">
              Explore Activities
            </h1>
            <p className="text-lg text-muted-foreground mb-8 animate-fade-in" style={{ animationDelay: "100ms" }}>
              Find the perfect activity for your next adventure
            </p>

            {/* Search */}
            <div className="relative max-w-xl mx-auto animate-fade-in" style={{ animationDelay: "200ms" }}>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 rounded-xl bg-card border-border shadow-card text-base"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Filters & Results */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-3 mb-8 justify-center">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={cn(
                  "px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                  selectedCategory === cat.name
                    ? "gradient-hero text-primary-foreground shadow-md"
                    : "bg-card text-foreground shadow-card hover:shadow-card-hover hover:-translate-y-0.5"
                )}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between mb-8">
            <p className="text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredActivities.length}</span> activities
            </p>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card shadow-card hover:shadow-card-hover transition-all duration-300 text-sm font-medium text-foreground">
              <Filter className="w-4 h-4" />
              More Filters
            </button>
          </div>

          {/* Activity Grid */}
          {filteredActivities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredActivities.map((activity, index) => (
                <ActivityCard key={activity.id} activity={activity} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No activities found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
