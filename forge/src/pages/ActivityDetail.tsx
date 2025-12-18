import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, MapPin, Users, Star, Calendar, CheckCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { activities } from "@/data/activities";

const highlights = [
  "Professional equipment provided",
  "Expert instructor guidance",
  "All skill levels welcome",
  "Safety briefing included",
  "Refreshments available",
];

export default function ActivityDetail() {
  const { id } = useParams();
  const activity = activities.find((a) => a.id === id);

  if (!activity) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-32 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Activity Not Found</h1>
          <p className="text-muted-foreground mb-8">The activity you're looking for doesn't exist.</p>
          <Button variant="hero" asChild>
            <Link to="/activities">Browse Activities</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Image */}
      <div className="pt-16 relative h-[50vh] min-h-[400px]">
        <img
          src={activity.image}
          alt={activity.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
        
        {/* Back Button */}
        <Link
          to="/activities"
          className="absolute top-24 left-4 md:left-8 flex items-center gap-2 px-4 py-2 rounded-full bg-card/90 backdrop-blur-sm text-foreground hover:bg-card transition-colors duration-300"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </Link>

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="container mx-auto">
            <Badge className="mb-4 bg-card/90 text-foreground backdrop-blur-sm border-0">
              {activity.category}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-card mb-4">
              {activity.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-card/80">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>{activity.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span>{activity.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>Max {activity.maxParticipants} people</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-gold fill-gold" />
                <span>{activity.rating} rating</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-foreground mb-4">About This Activity</h2>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  {activity.description}
                </p>
                <p className="text-muted-foreground leading-relaxed text-lg mt-4">
                  Join us for an unforgettable experience that combines fun, learning, and adventure. 
                  Whether you're a complete beginner or looking to enhance your skills, our expert 
                  instructors will guide you every step of the way. Come prepared to challenge yourself, 
                  meet new people, and create lasting memories.
                </p>
              </div>

              {/* Highlights */}
              <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
                <h2 className="text-2xl font-bold text-foreground mb-4">What's Included</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {highlights.map((highlight, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-hero flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <span className="text-foreground">{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
                <h2 className="text-2xl font-bold text-foreground mb-4">Available Times</h2>
                <div className="flex flex-wrap gap-3">
                  {["9:00 AM", "11:00 AM", "2:00 PM", "4:00 PM"].map((time) => (
                    <button
                      key={time}
                      className="px-5 py-3 rounded-xl bg-card border border-border hover:border-primary hover:text-primary transition-colors duration-300 font-medium"
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Booking Card */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-card rounded-2xl shadow-card-hover p-6 animate-fade-in" style={{ animationDelay: "300ms" }}>
                <div className="mb-6">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold text-primary">${activity.price}</span>
                    <span className="text-muted-foreground">/person</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Includes all equipment & instruction</p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                    <Calendar className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium text-foreground">Select a date</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                    <Users className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Guests</p>
                      <p className="font-medium text-foreground">1 adult</p>
                    </div>
                  </div>
                </div>

                <Button variant="hero" size="xl" className="w-full mb-4">
                  Book Now
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Free cancellation up to 24 hours before
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
