interface ExploreCardProps {
  imageSrc: string;
  alt: string;
  onClick?: () => void;
}

const ExploreCard = ({ imageSrc, alt, onClick }: ExploreCardProps) => {
  return (
    <button
      onClick={onClick}
      className="aspect-square rounded-2xl overflow-hidden hover:opacity-90 hover:scale-[1.02] transition-all duration-200"
    >
      <img 
        src={imageSrc} 
        alt={alt}
        className="w-full h-full object-cover"
      />
    </button>
  );
};

export default ExploreCard;
