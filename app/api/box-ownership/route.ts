import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 设置 CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function POST(req: NextRequest) {
  try {
    // 验证认证
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.substring(7)
    const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!)
    
    let userId: string
    try {
      const { payload } = await jwtVerify(token, secret)
      userId = payload.sub as string
    } catch (error) {
      console.error('JWT verification failed:', error)
      return NextResponse.json(
        { error: 'Invalid token' }, 
        { status: 401, headers: corsHeaders }
      )
    }

    // 获取请求体
    const body = await req.json()
    const { projectId, roomId, boxType, boxUuid } = body

    if (!projectId || !roomId || !boxType || !boxUuid) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400, headers: corsHeaders }
      )
    }

    // 根据 boxType 决定存储在哪个表
    let tableName = ''
    let uuidField = ''
    
    switch (boxType) {
      case 'TrackBox':
        tableName = 'track_ownership'
        uuidField = 'track_id'
        break
      case 'AudioUnitBox':
        tableName = 'audiounit_ownership'
        uuidField = 'audiounit_id'
        break
      default:
        // 对于其他类型的 Box，存储在通用表中
        tableName = 'box_ownership'
        uuidField = 'box_uuid'
    }

    // 检查是否已存在
    const { data: existing } = await supabase
      .from(tableName)
      .select('*')
      .eq(uuidField, boxUuid)
      .eq('project_id', projectId)
      .eq('room_id', roomId)
      .single()

    if (existing) {
      return NextResponse.json(
        { 
          error: `${boxType} already claimed`,
          ownerId: existing.user_id 
        }, 
        { status: 409, headers: corsHeaders }
      )
    }

    // 创建所有权记录
    const insertData: any = {
      [uuidField]: boxUuid,
      project_id: projectId,
      room_id: roomId,
      user_id: userId,
      created_at: new Date().toISOString()
    }

    // 如果是通用 box_ownership 表，添加 box_type 字段
    if (tableName === 'box_ownership') {
      insertData.box_type = boxType
    }

    const { data, error } = await supabase
      .from(tableName)
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error(`Error creating ${boxType} ownership:`, error)
      return NextResponse.json(
        { error: 'Failed to create ownership' }, 
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      {
        success: true,
        ownership: data
      },
      { headers: corsHeaders }
    )

  } catch (error) {
    console.error('Error in box ownership API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500, headers: corsHeaders }
    )
  }
}

// 获取 Box 所有权信息
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const boxUuid = searchParams.get('boxUuid')
    
    if (!projectId || !boxUuid) {
      return NextResponse.json(
        { error: 'Missing projectId or boxUuid' }, 
        { status: 400, headers: corsHeaders }
      )
    }

    // 先尝试从特定表查询
    const tables = [
      { name: 'track_ownership', field: 'track_id' },
      { name: 'audiounit_ownership', field: 'audiounit_id' },
      { name: 'box_ownership', field: 'box_uuid' }
    ]

    for (const { name, field } of tables) {
      const { data } = await supabase
        .from(name)
        .select('*')
        .eq(field, boxUuid)
        .eq('project_id', projectId)
        .single()

      if (data) {
        return NextResponse.json(
          { ownership: data },
          { headers: corsHeaders }
        )
      }
    }

    return NextResponse.json(
      { ownership: null },
      { headers: corsHeaders }
    )

  } catch (error) {
    console.error('Error getting box ownership:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500, headers: corsHeaders }
    )
  }
}

// 处理 OPTIONS 请求
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}