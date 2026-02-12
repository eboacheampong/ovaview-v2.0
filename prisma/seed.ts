import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  // Create Industries with Sub-industries
  const industries = [
    { name: 'Technology', subIndustries: ['Software', 'Hardware', 'AI/ML', 'Cybersecurity'] },
    { name: 'Finance', subIndustries: ['Banking', 'Insurance', 'Investment', 'Fintech'] },
    { name: 'Healthcare', subIndustries: ['Pharmaceuticals', 'Medical Devices', 'Hospitals', 'Biotech'] },
    { name: 'Energy', subIndustries: ['Oil & Gas', 'Renewable', 'Utilities', 'Mining'] },
    { name: 'Media', subIndustries: ['Broadcasting', 'Publishing', 'Digital Media'] },
  ]

  for (const ind of industries) {
    await prisma.industry.upsert({
      where: { name: ind.name },
      update: {},
      create: {
        name: ind.name,
        subIndustries: { create: ind.subIndustries.map(sub => ({ name: sub })) },
      },
    })
  }
  console.log('Industries created')
  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
