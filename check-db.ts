import { prisma } from "@/lib/prisma";

async function main() {
  try {
    // Check how many DailyInsight records exist
    const count = await prisma.dailyInsight.count();
    console.log(`Total DailyInsight records: ${count}`);

    // Get first 5 articles
    const articles = await prisma.dailyInsight.findMany({
      take: 5,
      orderBy: { scrapedAt: 'desc' },
    });

    console.log('Recent articles:');
    articles.forEach((article, i) => {
      console.log(`${i + 1}. ${article.title?.substring(0, 60) || 'No title'}`);
      console.log(`   URL: ${article.url}`);
      console.log(`   Status: ${article.status}`);
      console.log(`   Scraped: ${article.scrapedAt}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
