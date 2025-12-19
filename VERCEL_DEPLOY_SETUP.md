# Vercel 자동 배포 설정 가이드

## 방법 1: GitHub Actions 사용 (권장)

GitHub Actions를 사용하면 Git 푸시 시 자동으로 Vercel에 배포됩니다.

### 1. Vercel 토큰 생성
1. [Vercel Dashboard](https://vercel.com/account/tokens) 접속
2. **Create Token** 클릭
3. 토큰 이름 입력 (예: "COST2 Auto Deploy")
4. 토큰 복사 (한 번만 표시됨!)

### 2. Vercel 프로젝트 정보 확인
1. Vercel Dashboard에서 프로젝트 선택
2. **Settings** → **General** 탭
3. 다음 정보 확인:
   - **Project ID**: `vercel-project-id`
   - **Organization ID**: `vercel-org-id`

### 3. GitHub Secrets 설정
1. GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions**
2. 다음 Secrets 추가:
   - `VERCEL_TOKEN`: Vercel 토큰
   - `VERCEL_ORG_ID`: Organization ID
   - `VERCEL_PROJECT_ID`: Project ID

### 4. 배포 확인
- Git 푸시 후 GitHub Actions 탭에서 배포 상태 확인
- Vercel Dashboard에서 자동 배포 확인

---

## 방법 2: Vercel CLI 사용 (로컬)

### 1. Vercel 로그인
```bash
vercel login
```

### 2. 프로젝트 연결
```bash
vercel link
```

### 3. 자동 배포 테스트
```bash
vercel --prod
```

이제 `auto_update_dashboard.py`가 실행되면 자동으로 Vercel에 배포됩니다!

---

## 현재 설정 상태

✅ GitHub Actions 워크플로우 생성됨 (`.github/workflows/deploy.yml`)
✅ `auto_update_dashboard.py`에 배포 함수 추가됨

⚠️ **다음 단계 필요:**
1. Vercel 토큰 생성 및 GitHub Secrets 설정 (방법 1)
   또는
2. `vercel login` 및 `vercel link` 실행 (방법 2)




