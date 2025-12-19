import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

/**
 * 아이템별 원가율 Excel 파일 생성 API
 * 
 * Python 스크립트를 실행하여 지정된 기간의 아이템별 원가율 Excel 파일을 생성합니다.
 * 
 * 사용 예시:
 * GET /api/generate-item-cost-rate-csv?period=26SS
 * GET /api/generate-item-cost-rate-csv?period=25FW
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');

    if (!period) {
      return NextResponse.json(
        { error: '기간(period) 파라미터가 필요합니다. 예: ?period=26SS' },
        { status: 400 }
      );
    }

    // 기간 유효성 검사
    const validPeriods = ['26SS', '26S', '25SS', '25S', '25FW', '25F', '24SS', '24S', '24FW', '24F'];
    const periodUpper = period.toUpperCase();
    
    if (!validPeriods.includes(periodUpper)) {
      return NextResponse.json(
        { error: `유효하지 않은 기간입니다. 가능한 기간: ${validPeriods.join(', ')}` },
        { status: 400 }
      );
    }

    console.log(`[API] 아이템별 원가율 Excel 파일 생성 요청: 기간=${periodUpper}`);

    // Python 스크립트 경로
    const scriptPath = path.join(process.cwd(), 'generate_item_cost_rate_csv.py');
    
    // Python 실행 명령어
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
    const command = `${pythonCommand} "${scriptPath}" --period ${periodUpper}`;

    console.log(`[API] 실행 명령어: ${command}`);

    // Python 스크립트 실행
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    if (stderr && !stderr.includes('[OK]') && !stderr.includes('[INFO]') && !stderr.includes('[WARN]')) {
      console.error('[API] Python 스크립트 실행 오류:', stderr);
      return NextResponse.json(
        { error: 'Excel 파일 생성 중 오류가 발생했습니다.', details: stderr },
        { status: 500 }
      );
    }

    console.log('[API] Python 스크립트 실행 완료');
    console.log('[API] 출력:', stdout);

    // 출력 파일 경로 결정
    let seasonFolder = '';
    if (periodUpper.includes('26SS') || periodUpper.includes('26S')) {
      seasonFolder = '26SS';
    } else if (periodUpper.includes('25SS') || periodUpper.includes('25S')) {
      seasonFolder = '25S';
    } else if (periodUpper.includes('25FW') || periodUpper.includes('25F')) {
      seasonFolder = '25FW';
    } else if (periodUpper.includes('24SS') || periodUpper.includes('24S')) {
      seasonFolder = '24S';
    } else if (periodUpper.includes('24FW') || periodUpper.includes('24F')) {
      seasonFolder = '24FW';
    } else {
      seasonFolder = periodUpper;
    }

    const outputFile = `COST RAW/${seasonFolder}/item_cost_rate_${periodUpper}.xlsx`;

    return NextResponse.json({
      success: true,
      message: `아이템별 원가율 Excel 파일이 생성되었습니다.`,
      period: periodUpper,
      outputFile: outputFile,
      stdout: stdout,
    });
  } catch (error: any) {
    console.error('[API] Excel 파일 생성 오류:', error);
    
    // Python이 설치되지 않은 경우
    if (error.message?.includes('python') || error.message?.includes('python3')) {
      return NextResponse.json(
        { error: 'Python이 설치되지 않았거나 PATH에 등록되지 않았습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Excel 파일 생성 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}















