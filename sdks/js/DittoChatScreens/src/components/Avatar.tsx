import { Icons } from "./Icons";

export default function Avatar({ imageUrl }: { imageUrl?: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-(--secondary-bg-hover) flex items-center justify-center">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={"avathar"}
          className="w-10 h-10 rounded-full"
        />
      ) : (
        <Icons.hashtag className="w-4 h-4 text-(--text-color)" />
      )}
    </div>
  );
}
