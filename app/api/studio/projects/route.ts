import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const projects = await prisma.studioProject.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching studio projects:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, data, userId } = body

    if (!name || !data || !userId) {
      return NextResponse.json({ error: 'Name, data, and userId are required' }, { status: 400 })
    }

    const project = await prisma.studioProject.create({
      data: {
        name,
        projectData: data,
        userId
      }
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating studio project:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
