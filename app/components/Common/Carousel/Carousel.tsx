import React from "react";
import { BlockStack, Text, InlineStack, Button, Link } from "@shopify/polaris";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import { Link as RouterLink } from "@remix-run/react";

type Slide = {
  image: string;
  title: string;
  description: string;
  link?: { url: string; text: string };
  externalLink?: { url: string; text: string };
};

interface CarouselProps {
  slides: Slide[];
}

export default function Carousel({ slides }: CarouselProps) {
  interface PaginationOptions {
    clickable: boolean;
    renderBullet: (index: number, className: string) => string;
  }

  const pagination: PaginationOptions = {
    clickable: true,
    renderBullet: function (index: number, className: string): string {
      return `<span class="${className}"></span>`;
    },
  };
  return (
    <div>
      <Swiper
        pagination={pagination}
        modules={[Autoplay, Pagination, Navigation]}
        style={{ width: "100%", height: "200px", borderRadius: "12px" }}
        spaceBetween={30}
        centeredSlides
        autoplay={{
          delay: 2500,
          disableOnInteraction: false,
        }}
      >
        {slides.map((slide, i) => (
          <SwiperSlide key={i}>
            <img
              style={{
                position: "absolute",
                top: "0px",
                left: "0px",
                height: "100%",
                width: "100%",
                zIndex: 0,
                objectFit: "cover",
              }}
              src={slide.image}
              alt={slide.title}
            />
            <div
              style={{
                zIndex: 1,
                background: "transparent",
                position: "relative",
                padding: "40px",
                maxWidth: "70%",
              }}
            >
              <BlockStack gap="400">
                <Text as="p" variant="headingLg" tone="text-inverse">
                  {slide.title}
                </Text>
                <Text as="p" variant="headingSm" tone="text-inverse">
                  {slide.description}
                </Text>
                <InlineStack gap="400">
                  {slide.link && (
                    <RouterLink to={slide.link.url}>
                      <Button>{slide.link.text}</Button>
                    </RouterLink>
                  )}

                  {slide.externalLink && (
                    <Link
                      url={slide.externalLink.url}
                      external
                      removeUnderline
                      monochrome
                    >
                      <Text as="p" tone="text-inverse">
                        {slide.externalLink.text}
                      </Text>
                    </Link>
                  )}
                </InlineStack>
              </BlockStack>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
