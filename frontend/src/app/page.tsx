import { CategoryRail } from "@/components/CategoryRail";
import { HomeHero } from "@/components/HomeHero";
import { HomeSections } from "@/components/HomeSections";
import { GenreDirectory } from "@/components/store/GenreDirectory";

export default function Home() {
  return (
    <div className="bg-eneba pb-4">
      <HomeHero />
      <CategoryRail />
      <div className="pt-2 lg:pt-3">
        <HomeSections />
      </div>
      <div className="site-container pb-8">
        <GenreDirectory />
      </div>
    </div>
  );
}
