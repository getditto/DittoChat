import { Activity } from "@/components/ActivityCard";

export const activities: Activity[] = [
  {
    id: "yoga-sunrise",
    title: "Sunrise Beach Yoga",
    category: "Wellness",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop",
    duration: "1.5 hours",
    location: "Malibu Beach",
    maxParticipants: 15,
    rating: 4.9,
    price: 35,
    description: "Start your day with peaceful yoga sessions on the beach as the sun rises over the horizon."
  },
  {
    id: "rock-climbing",
    title: "Indoor Rock Climbing",
    category: "Sports",
    image: "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&auto=format&fit=crop",
    duration: "2 hours",
    location: "City Gym",
    maxParticipants: 8,
    rating: 4.8,
    price: 45,
    description: "Challenge yourself with our expert-led rock climbing sessions suitable for all levels."
  },
  {
    id: "pottery-class",
    title: "Pottery Workshop",
    category: "Arts & Crafts",
    image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&auto=format&fit=crop",
    duration: "3 hours",
    location: "Art Studio",
    maxParticipants: 10,
    rating: 4.7,
    price: 55,
    description: "Learn the art of pottery making from scratch. Create your own unique ceramic pieces."
  },
  {
    id: "hiking-adventure",
    title: "Mountain Hiking Trail",
    category: "Outdoor",
    image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&auto=format&fit=crop",
    duration: "4 hours",
    location: "Blue Ridge",
    maxParticipants: 12,
    rating: 4.9,
    price: 40,
    description: "Explore breathtaking mountain trails with experienced guides and stunning views."
  },
  {
    id: "cooking-class",
    title: "Italian Cooking Class",
    category: "Food & Drink",
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop",
    duration: "2.5 hours",
    location: "Culinary Center",
    maxParticipants: 8,
    rating: 4.8,
    price: 75,
    description: "Master authentic Italian recipes with our professional chefs. Includes tasting!"
  },
  {
    id: "photography-walk",
    title: "Urban Photography Walk",
    category: "Arts & Crafts",
    image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800&auto=format&fit=crop",
    duration: "3 hours",
    location: "Downtown",
    maxParticipants: 10,
    rating: 4.6,
    price: 50,
    description: "Capture the city's hidden gems with professional photography guidance."
  },
  {
    id: "kayaking",
    title: "River Kayaking",
    category: "Outdoor",
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop",
    duration: "3 hours",
    location: "River Bay",
    maxParticipants: 6,
    rating: 4.7,
    price: 60,
    description: "Paddle through scenic waterways and experience nature from a unique perspective."
  },
  {
    id: "dance-class",
    title: "Salsa Dance Class",
    category: "Dance",
    image: "https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800&auto=format&fit=crop",
    duration: "1.5 hours",
    location: "Dance Hall",
    maxParticipants: 20,
    rating: 4.8,
    price: 30,
    description: "Learn the passionate moves of salsa dancing with professional instructors."
  }
];

export const categories = [
  { name: "All", count: activities.length },
  { name: "Wellness", count: activities.filter(a => a.category === "Wellness").length },
  { name: "Sports", count: activities.filter(a => a.category === "Sports").length },
  { name: "Arts & Crafts", count: activities.filter(a => a.category === "Arts & Crafts").length },
  { name: "Outdoor", count: activities.filter(a => a.category === "Outdoor").length },
  { name: "Food & Drink", count: activities.filter(a => a.category === "Food & Drink").length },
  { name: "Dance", count: activities.filter(a => a.category === "Dance").length },
];
