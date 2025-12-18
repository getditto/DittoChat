import { Link } from "react-router-dom";
import { Heart, Globe, Award, TrendingUp, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

const stats = [
  { value: "500+", label: "Activities" },
  { value: "50K+", label: "Happy Users" },
  { value: "100+", label: "Locations" },
  { value: "4.9", label: "Avg Rating" },
];

const values = [
  {
    icon: Heart,
    title: "Passion First",
    description: "We believe every activity should spark joy and create meaningful experiences.",
  },
  {
    icon: Globe,
    title: "Community Driven",
    description: "Building connections between enthusiasts and experts across the globe.",
  },
  {
    icon: Award,
    title: "Quality Assured",
    description: "Every activity is vetted to ensure the highest standards of safety and fun.",
  },
  {
    icon: TrendingUp,
    title: "Always Growing",
    description: "Continuously expanding our offerings to bring you new adventures.",
  },
];

const team = [
  {
    name: "Sarah Chen",
    role: "Founder & CEO",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop",
  },
  {
    name: "Marcus Johnson",
    role: "Head of Experience",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop",
  },
  {
    name: "Emily Park",
    role: "Community Lead",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&auto=format&fit=crop",
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-5" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-in">
              We're on a Mission to{" "}
              <span className="text-gradient">Inspire Adventure</span>
            </h1>
            <p className="text-xl text-muted-foreground animate-fade-in" style={{ animationDelay: "100ms" }}>
              ActiveHub connects people with transformative experiences that enrich lives 
              and create lasting memories.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="text-center animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-4xl md:text-5xl font-bold text-gradient mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Our Story
              </h2>
              <div className="space-y-4 text-muted-foreground text-lg">
                <p>
                  ActiveHub was born from a simple idea: everyone deserves access to 
                  enriching experiences that help them grow, connect, and discover 
                  new passions.
                </p>
                <p>
                  Founded in 2020, we started as a small team of adventure enthusiasts 
                  who believed that finding and booking activities should be as exciting 
                  as the experiences themselves.
                </p>
                <p>
                  Today, we've grown into a thriving community connecting thousands of 
                  people with hundreds of unique activities, from peaceful yoga sessions 
                  to adrenaline-pumping adventures.
                </p>
              </div>
            </div>
            <div className="relative animate-fade-in" style={{ animationDelay: "200ms" }}>
              <div className="aspect-square rounded-3xl overflow-hidden shadow-card-hover">
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop"
                  alt="Team collaboration"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 w-48 h-48 rounded-2xl gradient-hero opacity-20 blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Values
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div
                key={value.title}
                className="p-6 bg-card rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-2 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-14 h-14 rounded-xl gradient-hero flex items-center justify-center mb-4">
                  <value.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {value.title}
                </h3>
                <p className="text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Meet Our Team
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              The passionate people behind ActiveHub
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {team.map((member, index) => (
              <div
                key={member.name}
                className="text-center animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-40 h-40 rounded-full overflow-hidden mx-auto mb-4 shadow-card-hover">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-1">
                  {member.name}
                </h3>
                <p className="text-muted-foreground">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="gradient-hero rounded-3xl p-12 md:p-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Join the Adventure
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
              Start exploring activities that will transform your everyday life into extraordinary experiences.
            </p>
            <Button
              variant="secondary"
              size="xl"
              className="bg-card text-foreground hover:bg-card/90"
              asChild
            >
              <Link to="/activities">
                Browse Activities
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
