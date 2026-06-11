import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const products = [
    {
      name: "Classic Rose Bouquet",
      slug: "classic-rose-bouquet",
      category: "Rose",
      description:
        "A timeless arrangement of fresh red roses, wrapped in kraft paper with a satin ribbon. Perfect for anniversaries and romantic gestures.",
      price: 899,
      productionDays: 1,
      imageUrl: "https://images.unsplash.com/photo-1518895949257-762f890ed4e2?w=800&q=80",
    },
    {
      name: "Pastel Tulip Mix",
      slug: "pastel-tulip-mix",
      category: "Tulip",
      description:
        "Soft pastel tulips in pink, cream, and lavender. Light and elegant — ideal for birthdays and spring celebrations.",
      price: 749,
      productionDays: 1,
      imageUrl: "https://images.unsplash.com/photo-1520763185348-1b434c631638?w=800&q=80",
    },
    {
      name: "Mini Desk Bouquet",
      slug: "mini-desk-bouquet",
      category: "Mini",
      description:
        "A petite bouquet of mixed seasonal blooms. Fits perfectly on a desk or bedside table. Great for everyday surprises.",
      price: 399,
      productionDays: 1,
      imageUrl: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&q=80",
    },
    {
      name: "Premium Orchid Collection",
      slug: "premium-orchid-collection",
      category: "Premium",
      description:
        "Luxurious white and purple orchids arranged with eucalyptus. Our most elegant bouquet for weddings and special occasions.",
      price: 2499,
      productionDays: 2,
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80",
    },
    {
      name: "Custom Occasion Bouquet",
      slug: "custom-occasion-bouquet",
      category: "Custom",
      description:
        "Tell us your colors, occasion, and vibe — we craft a one-of-a-kind bouquet. Includes a consultation note in your order.",
      price: 1299,
      productionDays: 2,
      imageUrl: "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?w=800&q=80",
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      create: {
        name: p.name,
        slug: p.slug,
        category: p.category,
        description: p.description,
        price: p.price,
        productionDays: p.productionDays,
        images: { create: { imageUrl: p.imageUrl, sortOrder: 0 } },
      },
      update: {},
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i <= 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const capacity = i % 7 === 0 ? 5 : i % 3 === 0 ? 15 : 10;

    await prisma.capacity.upsert({
      where: { date },
      create: { date, maximumCapacity: capacity },
      update: {},
    });
  }

  console.log("Seed complete: products and 30 days of capacity");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
