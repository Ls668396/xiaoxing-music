@echo off
chcp 65001 >nul
echo ============================================
echo   小星音乐API - 一键部署到 Vercel
echo ============================================
echo.

:: 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  [错误] 请先安装 Node.js: https://nodejs.org
    echo  下载 LTS 版本，安装后重新运行本脚本
    pause
    exit /b 1
)
echo  [OK] Node.js 已安装

:: 安装 Vercel CLI
echo.
echo  安装 Vercel CLI...
call npm install -g vercel
if %errorlevel% neq 0 (
    echo  [警告] 全局安装失败，尝试用 npx...
)

:: 部署
echo.
echo  开始部署...
echo  浏览器会自动打开，请用 GitHub 账号登录
echo.
echo  第一次登录会问几个问题，全部按回车选默认即可：
echo    Set up and deploy? → Y
echo    Which scope? → 选你的账号
echo    Link to existing project? → N
echo    What's your project name? → 直接回车
echo    In which directory? → 直接回车
echo    Override settings? → N
echo.
pause

npx vercel --prod

echo.
echo ============================================
echo   部署完成！
echo.
echo   请复制上面显示的网址 (类似 xiaoxing-xxx.vercel.app)
echo   然后填入 ESP32 固件的 music_player.py 中
echo ============================================
pause
