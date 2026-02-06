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

  // Create Web Publications
  const webPubs = ['233livenews.com', 'TechCrunch Africa', 'Business Daily Online', 'MyJoyOnline', 'GhanaWeb', 'Citinewsroom']
  for (const name of webPubs) {
    await prisma.webPublication.upsert({ where: { name }, update: {}, create: { name } })
  }
  console.log('Web publications created')

  // Create TV Stations and Programs
  const tvStations = [
    { name: 'KTN News', channel: 'Channel 10', programs: ['Prime Time News', 'Morning Show'] },
    { name: 'NTV', channel: 'Channel 5', programs: ['The Trend', 'Business Weekly'] },
    { name: 'Citizen TV', channel: 'Channel 3', programs: ['News Night', 'Day Break'] },
    { name: 'TV47', channel: 'Channel 47', programs: ['47 Live', 'Headline News'] },
  ]
  for (const station of tvStations) {
    await prisma.tVStation.upsert({
      where: { name: station.name },
      update: {},
      create: {
        name: station.name,
        channel: station.channel,
        programs: { create: station.programs.map(p => ({ name: p })) },
      },
    })
  }
  console.log('TV stations created')

  // Create Radio Stations and Programs
  const radioStations = [
    { name: 'Radio One FM', frequency: '90.5 FM', programs: ['Morning Show', 'Drive Time'] },
    { name: 'Capital Radio', frequency: '91.3 FM', programs: ['The Breakfast Club', 'Business Hour'] },
    { name: 'Kiss FM', frequency: '100.3 FM', programs: ['Evening Jazz', 'Top 40'] },
    { name: 'Classic FM', frequency: '105.2 FM', programs: ['Classical Hour', 'News Update'] },
  ]
  for (const station of radioStations) {
    await prisma.radioStation.upsert({
      where: { name: station.name },
      update: {},
      create: {
        name: station.name,
        frequency: station.frequency,
        programs: { create: station.programs.map(p => ({ name: p })) },
      },
    })
  }
  console.log('Radio stations created')

  // Create Print Publications and Issues
  const printPubs = [
    { name: 'Daily Graphic', issues: ['Vol. 45, No. 12 - Jan 15, 2024', 'Vol. 45, No. 11 - Jan 14, 2024'] },
    { name: 'Ghanaian Times', issues: ['Issue 234 - Jan 15, 2024', 'Issue 233 - Jan 14, 2024'] },
    { name: 'Business & Financial Times', issues: ['Edition 156', 'Edition 155'] },
    { name: 'Daily Guide', issues: ['Issue 890', 'Issue 889'] },
  ]
  for (const pub of printPubs) {
    await prisma.printPublication.upsert({
      where: { name: pub.name },
      update: {},
      create: {
        name: pub.name,
        issues: { create: pub.issues.map(i => ({ name: i })) },
      },
    })
  }
  console.log('Print publications created')

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
