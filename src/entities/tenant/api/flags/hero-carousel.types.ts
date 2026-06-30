export interface CarouselItem {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
  link?: string;
}

export interface HeroCarouselConfig {
  items: CarouselItem[];
}
