@echo off
mkdir ..\cognibot_new\backend
mkdir ..\cognibot_new\frontend

copy App.js ..\cognibot_new\
xcopy /E /I frontend\* ..\cognibot_new\frontend
copy backend\app.py ..\cognibot_new\backend\app.py
copy backend\quizbot.db ..\cognibot_new\backend\quizbot.db
mkdir ..\cognibot_new\backend\temp_uploads
xcopy /E /I backend\temp_uploads\* ..\cognibot_new\backend\temp_uploads
copy install_dependencies.bat ..\cognibot_new\
copy requirements.txt ..\cognibot_new\
copy .gitignore ..\cognibot_new\

echo # API Keys > ..\cognibot_new\backend\.env
echo HUGGINGFACE_TOKEN=your_huggingface_token_here >> ..\cognibot_new\backend\.env
echo SAMBANOVA_API_KEY=your_sambanova_api_key_here >> ..\cognibot_new\backend\.env

echo Files copied successfully with sensitive info removed.
echo Please replace the API keys in backend\.env with your actual keys. 