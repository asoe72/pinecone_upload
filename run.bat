@echo off

:: ask 시험만 수행하면서 log
:: node index.js -skipClone -skipUpload -doLog

:: clone, uplod to DB, test를 skip
:: node index.js -skipClone -skipUploadToDb -doLogDataToUpload -skipTestAsking -doLog

:: node index.js -skipClone -skipUpload -skipTestAsking

:: clone 제외 전 과정 수행
node index.js -skipClone -doLogDataToUpload -doLog

:: 전 과정 수행
:: node index.js