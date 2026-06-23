import { PrismaClient, OrderStatus, PaymentStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seeding...");

  // 1. Setup Production Config
  const config = await prisma.productionConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      hoursPerDay: 8.0,
      maxDaysPerOrder: 30,
    },
  });
  console.log("✅ Production config initialized");

  // 2. Setup Settings
  const settings = [
    { key: "shop_name", value: "Floral Art Studio" },
    { key: "contact_email", value: "hello@floralart.com" },
    { key: "currency", value: "INR" },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log("✅ Settings initialized");

  // 3. Create Products
  const products = [
    {
      name: "Classic Rose Bouquet",
      slug: "classic-rose-bouquet",
      category: "Rose",
      description: "A timeless arrangement of fresh red roses.",
      price: 899,
      productionHours: 1.5, // 1 hour 30 mins
      active: true,
      imageUrl:
        "https://images.unsplash.com/photo-1518895949257-762f890ed4e2?w=800&q=80",
    },
    {
      name: "Pastel Tulip Mix",
      slug: "pastel-tulip-mix",
      category: "Tulip",
      description: "Soft pastel tulips in pink, cream, and lavender.",
      price: 749,
      productionHours: 1.0,
      active: true,
      imageUrl:
        "https://images.unsplash.com/photo-1520763185348-1b434c631638?w=800&q=80",
    },
    {
      name: "Premium Orchid Collection",
      slug: "premium-orchid-collection",
      category: "Premium",
      description: "Luxurious white and purple orchids.",
      price: 2499,
      productionHours: 3.5,
      active: true,
      imageUrl:
        "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80",
    },
    {
      name: "Mini Desk Bouquet",
      slug: "mini-desk-bouquet",
      category: "Mini",
      description: "A petite bouquet for your workspace.",
      price: 399,
      productionHours: 0.5,
      active: true,
      imageUrl:
        "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&q=80",
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        productionHours: p.productionHours,
        price: p.price,
      },
      create: p,
    });
  }
  console.log("✅ Products initialized");

  // 4. Create a Test User
  const testUser = await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {},
    create: {
      name: "John Doe",
      email: "customer@example.com",
      mobileNo: "9876543210",
      addresses: {
        create: {
          address: "123 Flower Lane",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400001",
        },
      },
    },
  });
  console.log("✅ Test user created");

  // 5. Initialize Capacity for the next 45 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 45; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    // Weekends might have different capacity
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const dailyHours = isWeekend ? 4.0 : 8.0;

    await prisma.capacity.upsert({
      where: { date },
      update: {},
      create: {
        date,
        maximumHours: dailyHours,
        availableHours: dailyHours,
      },
    });
  }
  console.log("✅ 45 days of capacity initialized");

  console.log("🌱 Seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
