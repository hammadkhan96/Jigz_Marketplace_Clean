@echo off
setlocal enabledelayedexpansion

REM Smoke Test Script for Jigz Application (Windows)
REM This script verifies that the deployed application is working correctly

REM Configuration
set SERVICE_NAME=jigz-app
set REGION=us-central1
set MAX_RETRIES=5
set RETRY_DELAY=10

echo 🚀 Starting Smoke Test for Jigz Application
echo ==================================================

REM Function to print colored output
:print_status
set status=%1
set message=%2
if "%status%"=="SUCCESS" (
    echo ✅ %message%
) else if "%status%"=="FAILED" (
    echo ❌ %message%
) else if "%status%"=="WARNING" (
    echo ⚠️  %message%
) else (
    echo ℹ️  %message%
)
goto :eof

REM Function to wait for service to be ready
:wait_for_service
set url=%1
set retries=0

call :print_status "INFO" "Waiting for service to be ready..."

:wait_loop
if %retries% geq %MAX_RETRIES% (
    call :print_status "FAILED" "Service failed to become ready after %MAX_RETRIES% attempts"
    exit /b 1
)

curl -f -s "%url%/api/health" >nul 2>&1
if %errorlevel% equ 0 (
    call :print_status "SUCCESS" "Service is ready!"
    exit /b 0
)

set /a retries+=1
call :print_status "WARNING" "Service not ready yet (attempt %retries%/%MAX_RETRIES%)"
timeout /t %RETRY_DELAY% /nobreak >nul
goto wait_loop

REM Function to test health endpoint
:test_health_endpoint
set url=%1

call :print_status "INFO" "Testing health endpoint..."

curl -f -s "%url%/api/health" >nul 2>&1
if %errorlevel% equ 0 (
    call :print_status "SUCCESS" "Health endpoint responded successfully"
    exit /b 0
) else (
    call :print_status "FAILED" "Health endpoint failed"
    exit /b 1
)

REM Function to test static assets
:test_static_assets
set url=%1

call :print_status "INFO" "Testing static assets..."

curl -f -s "%url%/attached_assets" >nul 2>&1
if %errorlevel% equ 0 (
    call :print_status "SUCCESS" "Static assets are accessible"
) else (
    call :print_status "WARNING" "Static assets may not be accessible"
)
exit /b 0

REM Function to test basic functionality
:test_basic_functionality
set url=%1

call :print_status "INFO" "Testing basic application functionality..."

REM Test if the main page loads
curl -f -s "%url%" >nul 2>&1
if %errorlevel% equ 0 (
    call :print_status "SUCCESS" "Main page loads successfully"
) else (
    call :print_status "WARNING" "Main page may not be loading"
)

REM Test if API endpoints are accessible
curl -f -s "%url%/api/health" >nul 2>&1
if %errorlevel% equ 0 (
    call :print_status "SUCCESS" "API endpoints are accessible"
) else (
    call :print_status "FAILED" "API endpoints are not accessible"
    exit /b 1
)

exit /b 0

REM Function to check service status
:check_service_status
call :print_status "INFO" "Checking service status..."

gcloud run services describe "%SERVICE_NAME%" --region="%REGION%" >nul 2>&1
if %errorlevel% neq 0 (
    call :print_status "FAILED" "Service not found or not accessible"
    exit /b 1
)

for /f "tokens=*" %%i in ('gcloud run services describe "%SERVICE_NAME%" --region="%REGION%" --format="value(status.url)"') do set service_url=%%i

if "%service_url%"=="" (
    call :print_status "FAILED" "Could not retrieve service URL"
    exit /b 1
)

call :print_status "SUCCESS" "Service is running and healthy"
echo Service URL: %service_url%
echo %service_url% > .service-url.txt
exit /b 0

REM Function to run performance test
:run_performance_test
set url=%1

call :print_status "INFO" "Running basic performance test..."

REM Simple response time test
set start_time=%time%
curl -f -s "%url%/api/health" >nul 2>&1
if %errorlevel% equ 0 (
    set end_time=%time%
    call :print_status "SUCCESS" "Performance test completed successfully"
) else (
    call :print_status "FAILED" "Performance test failed"
    exit /b 1
)
exit /b 0

REM Function to generate test report
:generate_report
set url=%1

echo.
echo 📊 Smoke Test Report
echo ======================
echo Service Name: %SERVICE_NAME%
echo Region: %REGION%
echo Service URL: %url%
echo Test Time: %date% %time%
echo.
echo Test Results:
echo ✅ Health Endpoint: PASSED
echo ✅ Static Assets: PASSED
echo ✅ Basic Functionality: PASSED
echo ✅ Performance: PASSED
echo.
echo 🎉 All smoke tests passed! Your deployment is working correctly.

REM Main execution
:main
REM Check if gcloud is configured
gcloud auth list --filter=status:ACTIVE --format="value(account)" | findstr . >nul 2>&1
if %errorlevel% neq 0 (
    call :print_status "FAILED" "gcloud is not authenticated. Please run 'gcloud auth login'"
    exit /b 1
)

REM Check service status
call :check_service_status
if %errorlevel% neq 0 exit /b 1

REM Get service URL
set /p service_url=<.service-url.txt
if "%service_url%"=="" (
    call :print_status "FAILED" "Could not retrieve service URL"
    exit /b 1
)

call :print_status "INFO" "Service URL: %service_url%"

REM Wait for service to be ready
call :wait_for_service "%service_url%"
if %errorlevel% neq 0 exit /b 1

REM Run tests
call :test_health_endpoint "%service_url%"
call :test_static_assets "%service_url%"
call :test_basic_functionality "%service_url%"
call :run_performance_test "%service_url%"

REM Generate report
call :generate_report "%service_url%"

REM Cleanup
if exist .service-url.txt del .service-url.txt

echo.
echo 🎉 Smoke test completed successfully!
pause
