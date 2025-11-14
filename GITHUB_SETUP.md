# GitHub API를 통한 CSV 파일 저장 설정 가이드

웹 대시보드에서 편집한 내용이 GitHub의 CSV 파일에 직접 저장되도록 설정하는 방법입니다.

## 🔑 1. GitHub Personal Access Token 생성

1. GitHub에 로그인
2. **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. **Generate new token (classic)** 클릭
4. 다음 권한 선택:
   - ✅ `repo` (전체 저장소 접근 권한)
5. 토큰 생성 후 **반드시 복사해두세요!** (다시 볼 수 없습니다)

## 🔧 2. Vercel 환경 변수 설정

1. Vercel 대시보드 접속
2. 프로젝트 선택 → **Settings** → **Environment Variables**
3. 다음 환경 변수 추가:

```
GITHUB_TOKEN = ghp_xxxxxxxxxxxxxxxxxxxx (생성한 토큰)
GITHUB_REPO_OWNER = your-username (GitHub 사용자명)
GITHUB_REPO_NAME = COST2 (저장소 이름)
```

**예시:**
- `GITHUB_TOKEN`: `ghp_abc123def456ghi789...`
- `GITHUB_REPO_OWNER`: `AC1161`
- `GITHUB_REPO_NAME`: `COST2`

## 📝 3. 로컬 개발 환경 설정 (선택사항)

로컬에서도 테스트하려면 `.env.local` 파일에 추가:

```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_REPO_OWNER=your-username
GITHUB_REPO_NAME=COST2
```

⚠️ **주의**: `.env.local` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다.

## ✅ 4. 동작 확인

1. 웹 대시보드에서 인사이트 편집
2. "저장" 버튼 클릭
3. GitHub 저장소의 `public/insights_*.csv` 파일 확인
4. 변경사항이 자동으로 커밋되었는지 확인

## 🔒 보안 주의사항

- ✅ GitHub Token은 **절대** 코드에 하드코딩하지 마세요
- ✅ 환경 변수로만 관리하세요
- ✅ 토큰이 유출되면 즉시 GitHub에서 토큰을 삭제하세요
- ✅ 최소 권한 원칙: `repo` 권한만 부여하세요

## 🐛 문제 해결

### "GitHub configuration missing" 에러
- 환경 변수가 제대로 설정되었는지 확인
- Vercel에서 환경 변수 설정 후 **재배포** 필요

### "GitHub API error" 에러
- 토큰이 유효한지 확인
- 저장소 이름과 소유자가 정확한지 확인
- 토큰에 `repo` 권한이 있는지 확인

### 파일이 업데이트되지 않음
- GitHub 저장소의 기본 브랜치가 `main`인지 확인
- 다른 브랜치를 사용하는 경우 코드에서 `branch` 파라미터 수정 필요









