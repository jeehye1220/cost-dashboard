# 웹 배포 가이드

## 자동 배치 → 웹 배포 자동 반영

이제 자동 배치가 실행되면 자동으로 Git에 커밋/푸시되어 웹 배포에 반영됩니다.

## 배포 흐름

```
자동 배치 실행 (매일 오전 11시)
  ↓
SQL → CSV 생성
  ↓
SUMMARY JSON 생성
  ↓
인사이트 CSV 생성 (26SS만)
  ↓
Git 커밋 및 푸시 (자동)
  ↓
웹 배포 자동 반영 (Vercel 등)
```

## Vercel 배포 방법

### 1. Vercel 계정 준비
1. [Vercel](https://vercel.com)에 로그인
2. GitHub 계정 연동

### 2. 프로젝트 배포
1. Vercel 대시보드에서 **New Project** 클릭
2. GitHub 저장소 선택 (`COST2`)
3. 프로젝트 설정:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (기본값)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (기본값)
4. **Deploy** 클릭

### 3. 환경 변수 설정 (선택사항)
인사이트 편집 기능을 사용하려면:
- `GITHUB_TOKEN`: GitHub Personal Access Token
- `GITHUB_REPO_OWNER`: GitHub 사용자명
- `GITHUB_REPO_NAME`: COST2

**참고**: 웹 배포 환경에서는 편집 기능이 숨겨져 있으므로 필수는 아닙니다.

### 4. 자동 배포 설정
- Vercel은 기본적으로 `main` 브랜치에 푸시되면 자동 배포됩니다
- 자동 배치가 Git에 푸시하면 → Vercel이 자동으로 재배포합니다

## 배포 확인

### 배포 상태 확인
1. Vercel 대시보드에서 배포 상태 확인
2. 배포 완료 후 제공되는 URL로 접속
3. 대시보드가 정상적으로 로드되는지 확인

### 자동 배치 반영 확인
1. 자동 배치 실행 후 (매일 오전 11시)
2. GitHub 저장소에서 커밋 확인
3. Vercel에서 자동 재배포 확인
4. 웹 대시보드에서 최신 데이터 확인

## 주의사항

### Git 인증 설정
자동 배치가 Git 푸시를 하려면:
- **SSH 키 설정** 또는
- **Personal Access Token** 사용

**SSH 키 설정 방법:**
```bash
# SSH 키 생성 (이미 있으면 생략)
ssh-keygen -t ed25519 -C "your_email@example.com"

# 공개 키를 GitHub에 등록
# Settings → SSH and GPG keys → New SSH key
```

**Personal Access Token 사용:**
```bash
# Git 원격 URL을 HTTPS로 변경
git remote set-url origin https://YOUR_TOKEN@github.com/USERNAME/COST2.git
```

### 브랜치 이름 확인
- 기본 브랜치가 `main`이 아닌 경우 `auto_update_dashboard.py` 수정 필요
- `git push origin main` 부분을 실제 브랜치 이름으로 변경

## 문제 해결

### Git 푸시 실패
- Git 인증 확인
- 브랜치 이름 확인
- 네트워크 연결 확인

### 웹 배포 실패
- Vercel 로그 확인
- 빌드 오류 확인
- 환경 변수 확인

### 자동 배치가 웹에 반영 안 됨
- Git 커밋/푸시 로그 확인 (`logs/auto_update_YYYYMMDD.log`)
- Vercel 배포 로그 확인
- GitHub 저장소 커밋 히스토리 확인

