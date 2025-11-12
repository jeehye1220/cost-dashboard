import { NextRequest, NextResponse } from 'next/server';

// GitHub API를 사용하여 CSV 파일 업데이트
async function updateFileOnGitHub(
  fileName: string,
  newContent: string,
  githubToken: string,
  repoOwner: string,
  repoName: string,
  branch: string = 'main'
) {
  try {
    // 1. 기존 파일 정보 가져오기 (sha 필요)
    const getFileUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/public/${fileName}?ref=${branch}`;
    const getFileResponse = await fetch(getFileUrl, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    let sha: string | undefined;
    if (getFileResponse.ok) {
      const fileData = await getFileResponse.json();
      sha = fileData.sha;
    }

    // 2. Base64 인코딩
    const content = Buffer.from(newContent, 'utf-8').toString('base64');

    // 3. 파일 업데이트
    const updateUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/public/${fileName}`;
    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Update ${fileName} from web dashboard`,
        content: content,
        branch: branch,
        sha: sha, // 기존 파일이 있으면 sha 필요
      }),
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      throw new Error(`GitHub API error: ${JSON.stringify(error)}`);
    }

    return await updateResponse.json();
  } catch (error: any) {
    console.error('GitHub API error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { season, updates } = body;

    // 환경 변수 확인
    const githubToken = process.env.GITHUB_TOKEN;
    const repoOwner = process.env.GITHUB_REPO_OWNER;
    const repoName = process.env.GITHUB_REPO_NAME;

    if (!githubToken || !repoOwner || !repoName) {
      return NextResponse.json(
        { 
          error: 'GitHub configuration missing. Please set GITHUB_TOKEN, GITHUB_REPO_OWNER, and GITHUB_REPO_NAME environment variables.',
          details: {
            hasToken: !!githubToken,
            hasOwner: !!repoOwner,
            hasRepo: !!repoName,
          }
        },
        { status: 500 }
      );
    }

    // 시즌별 CSV 파일 매핑
    const fileMap: { [key: string]: string } = {
      '25FW': 'insights_25fw.csv',
      'NON': 'insights_non.csv',
      'KIDS': 'insights_kids.csv',
      'DISCOVERY': 'insights_discovery.csv',
    };

    const fileName = fileMap[season];
    if (!fileName) {
      return NextResponse.json(
        { error: `Unknown season: ${season}` },
        { status: 400 }
      );
    }

    // 기존 CSV 파일 내용 가져오기 (GitHub에서)
    let csvContent = '';
    try {
      const getFileUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/public/${fileName}`;
      const getFileResponse = await fetch(getFileUrl, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (getFileResponse.ok) {
        const fileData = await getFileResponse.json();
        csvContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
        // Base64 디코딩된 내용에서 줄바꿈 문자 정리
        csvContent = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      } else {
        // 파일이 없으면 헤더만 생성
        csvContent = 'section,key,value\n';
      }
    } catch (error) {
      console.error('Error fetching file from GitHub:', error);
      csvContent = 'section,key,value\n';
    }

    // CSV 파싱
    const lines = csvContent.split('\n').filter(line => line.trim());
    const dataRows: { section: string; key: string; value: string }[] = [];

    // 기존 데이터 읽기 (헤더 제외)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const firstComma = line.indexOf(',');
      const secondComma = line.indexOf(',', firstComma + 1);
      
      if (firstComma === -1 || secondComma === -1) continue;
      
      const section = line.substring(0, firstComma).trim();
      const key = line.substring(firstComma + 1, secondComma).trim();
      let value = line.substring(secondComma + 1).trim();
      
      // 따옴표 제거
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
        // 이스케이프된 따옴표 복원
        value = value.replace(/""/g, '"');
      }
      
      dataRows.push({ section, key, value });
    }

    // 업데이트 적용
    const updatedRows: { [key: string]: { section: string; key: string; value: string } } = {};
    
    // 기존 데이터를 맵으로 변환
    dataRows.forEach(row => {
      const mapKey = row.section;
      updatedRows[mapKey] = row;
    });

    // 업데이트 적용
    Object.keys(updates).forEach(section => {
      const newValue = updates[section];
      
      if (updatedRows[section]) {
        // 기존 행 업데이트
        updatedRows[section].value = newValue;
      } else {
        // 새 행 추가
        updatedRows[section] = {
          section: section,
          key: '',
          value: newValue,
        };
      }
    });

    // 배열로 변환
    const finalRows = Object.values(updatedRows);

    // CSV 형식으로 변환 (UTF-8 BOM 포함)
    let newCsvContent = '\ufeffsection,key,value\n';
    
    finalRows.forEach(row => {
      // 값에 쉼표나 따옴표가 있으면 따옴표로 감싸기
      let value = row.value;
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }
      newCsvContent += `${row.section},${row.key},${value}\n`;
    });

    // GitHub에 파일 업데이트
    await updateFileOnGitHub(
      fileName,
      newCsvContent,
      githubToken,
      repoOwner,
      repoName
    );

    return NextResponse.json({ 
      success: true, 
      message: `Insights saved for ${season} and committed to GitHub` 
    });
  } catch (error: any) {
    console.error('Error saving insights:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save insights' },
      { status: 500 }
    );
  }
}
