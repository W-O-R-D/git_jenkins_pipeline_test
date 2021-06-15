/*
  80번 포트 웹서버 띄우는 프로그램
*/

import express from 'express'

const app = express()

app.get('', (req, res, next) => {
  res.send(200)
})

app.listen(80, () => {
  console.log('listening...')
})
