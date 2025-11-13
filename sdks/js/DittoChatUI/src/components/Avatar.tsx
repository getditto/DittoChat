import { Icons } from "./Icons";

export default function Avatar({
  imageUrl,
  isUser = false,
}: {
  imageUrl?: string;
  isUser?: boolean;
}) {
  return (
    <div className="w-8 h-8 rounded-full bg-(--secondary-bg-hover) flex items-center justify-center">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={"avathar"}
          className="w-10 h-10 rounded-full"
        />
      ) : isUser ? (
        <Icons.userProfile className="w-4 h-4 text-(--text-color)" />
      ) : (
        <Icons.hashtag className="w-4 h-4 text-(--text-color)" />
      )}
    </div>
  );
}
