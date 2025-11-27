import { Icons } from "./Icons";

export default function Avatar({
  imageUrl,
  isUser = false,
  className = "",
}: {
  imageUrl?: string;
  isUser?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`w-10 h-10 rounded-full bg-(--secondary-bg-hover) flex items-center justify-center ${className}`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={"avathar"}
          className="w-full h-full rounded-full object-cover"
        />
      ) : isUser ? (
        <Icons.userProfile className="w-5 h-5 text-(--text-color)" />
      ) : (
        <Icons.hashtag className="w-5 h-5 text-(--text-color)" />
      )}
    </div>
  );
}
