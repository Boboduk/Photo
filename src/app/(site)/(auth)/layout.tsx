import { SmartImage } from "@/components/media/smart-image";
import { heroFallbackImages } from "@/config/hero";

/** Страницы входа и регистрации: форма слева, фотография справа. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const image = heroFallbackImages[1];
  return (
    <div className="container-page grid flex-1 gap-10 py-10 sm:py-16 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
      <div className="mx-auto flex w-full max-w-md flex-col justify-center">{children}</div>
      <div className="relative hidden overflow-hidden rounded-2xl bg-surface lg:block">
        <SmartImage src={image.url} alt={image.alt} fill sizes="45vw" className="object-cover" priority />
      </div>
    </div>
  );
}
