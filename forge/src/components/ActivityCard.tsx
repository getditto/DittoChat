import { Link } from "react-router-dom";
import { Clock, MapPin, Users, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Activity {
  id: string;
  title: string;
  category: string;
  image: string;
  duration: string;
  location: string;
  maxParticipants: number;
  rating: number;
  price: number;
  description: string;
}

interface ActivityCardProps {
  activity: Activity;
  index?: number;
}

export function ActivityCard({ activity, index = 0 }: ActivityCardProps) {
  return (
    <Link
      to={`/activities/${activity.id}`}
      className={cn(
        "group block bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2",
        "animate-fade-in"
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={activity.image}
          alt={activity.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent" />
        <Badge className="absolute top-4 left-4 bg-card/90 text-foreground backdrop-blur-sm border-0">
          {activity.category}
        </Badge>
        <div className="absolute top-4 right-4 flex items-center gap-1 bg-card/90 backdrop-blur-sm px-2 py-1 rounded-full">
          <Star className="w-4 h-4 text-gold fill-gold" />
          <span className="text-sm font-medium">{activity.rating}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
          {activity.title}
        </h3>
        
        <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
          {activity.description}
        </p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{activity.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{activity.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{activity.maxParticipants}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            <span className="text-2xl font-bold text-primary">${activity.price}</span>
            <span className="text-muted-foreground text-sm">/person</span>
          </div>
          <span className="text-sm font-medium text-primary group-hover:translate-x-1 transition-transform duration-300">
            View Details →
          </span>
        </div>
      </div>
    </Link>
  );
}
