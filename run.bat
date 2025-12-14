@echo off

:: ask 시험만 수행하면서 log
:: node index.js -skipPrepare -skipUpload -doFileLog

:: prepare(clone), uplod to DB, test를 skip
:: node index.js -skipPrepare -skipUploadToDb -doLogDataToUpload -skipTestAsking -doFileLog

:: node index.js -skipPrepare -skipUpload -skipTestAsking

:: prepare(clone) 제외 전 과정 수행
node index.js -skipPrepare -doLogDataToUpload -doFileLog

:: 전 과정 수행
:: node index.js