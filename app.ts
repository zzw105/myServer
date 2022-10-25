import express = require('express')
import cors = require('cors')
import mysql = require('mysql')
import { Request } from 'express'
import jwt = require('jsonwebtoken')
import { expressjwt } from 'express-jwt'
import multiparty = require('multiparty')
import fs = require('fs')
import images = require('images')
import formidable = require('formidable')
import path = require('path')

const AipOcrClient = require('baidu-aip-sdk').ocr
const SECRET_KEY = 'kite1874'
// 设置APPID/AK/SK
const BAIDU_APP_ID = '27283351'
const BAIDU_API_KEY = 'ctngrgHXWTy4hYflftY7o1r4'
const BAIDU_SECRET_KEY = 'Kjk1OXk2KWHrebXYH6ciCQRfL5fYkH2O'

// 新建一个对象，建议只保存一个对象调用服务接口
const client = new AipOcrClient(BAIDU_APP_ID, BAIDU_API_KEY, BAIDU_SECRET_KEY)
declare module 'express' {
  // eslint-disable-next-line no-unused-vars
  interface Request {
    auth: { userName: string }
  }
}

interface userInfo {
  id: number
  userName: string
  password: string
}

const app = express()

// 服务启动接口
const port = 1111
// 用户列表
let userRows: userInfo[] = []

// 解决跨域
app.use(cors())
// 获取post请求的body
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

//除了api开头的请求地址其他地址都需要验证
app.use(
  expressjwt({
    secret: SECRET_KEY,
    algorithms: ['HS256'],
    getToken: (req) => {
      return typeof req.headers.token === 'string' ? req.headers.token : ''
    }
  }).unless({
    path: ['/register', '/login', '/upload', '/upFile']
  })
)
// 数据库信息
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Zzw.547896321',
  database: '105'
})

// 启动数据库连接
connection.connect(function (err) {
  if (err) {
    console.log('error', err)
  }
  console.log('connect success!')
})

// 获取用户列表
const getUserRows = () => {
  connection.query('select * from user', function (err, row) {
    if (err) {
      console.log('query error!')
    } else {
      userRows = row
    }
  })
}
getUserRows()

// 首页请求 用于查看服务
app.get('/', (_req, res, _a) => {
  res.json({ code: 200, data: userRows })
})

// 注册
app.post('/register', (req, res) => {
  const body = req.body
  // const id = userRows.length
  if (!userRows.find((item) => item.userName === body.userName)) {
    connection.query('insert into user set ?', { ...body }, function (err) {
      if (err) {
        throw err
      }
    })

    getUserRows()

    connection.query('insert into asset set ?', { userName: body.userName, assetName: '默认账本', assetType: 1 }, (err) => {
      if (err) {
        res.json({
          code: 400,
          message: '注册失败',
          err
        })
      } else {
        connection.query('insert into asset set ?', { userName: body.userName, assetName: '花呗', assetType: 0 }, (err) => {
          if (err) {
            res.json({
              code: 400,
              message: '注册失败',
              err
            })
          } else {
            res.json({
              code: 200,
              message: '注册成功'
            })
          }
        })
      }
    })
  } else {
    res.json({
      code: 400,
      message: '用户名以重复'
    })
  }
})

// 登陆
app.post('/login', (req, res) => {
  const body = req.body
  const userInfo = userRows.find((item) => item.userName === body.userName)
  if (userInfo && userInfo.password === body.password) {
    const tokenStr = jwt.sign({ userName: body.userName }, SECRET_KEY, { expiresIn: '72h' })
    res.json({
      code: 200,
      message: '登陆成功',
      token: tokenStr
    })
  } else {
    res.json({
      code: 400,
      message: '用户名或密码不正确'
    })
  }
})

// 添加信息
app.post('/addAccount', (req: Request, res) => {
  const body = req.body
  if (body.id === -1) {
    delete body.id
    connection.query('insert into book set ?', { ...body, userName: req.auth.userName }, function (err) {
      if (err) {
        res.json({
          code: 400,
          message: '添加失败',
          err
        })
      } else {
        res.json({
          code: 200,
          message: '添加成功'
        })
      }
    })
  } else {
    connection.query('update book set ?  where id = ?', [body, body.id], (err, _data) => {
      if (err) {
        res.json({
          code: 400,
          message: '更新失败',
          err
        })
      } else {
        res.json({
          code: 200,
          message: '更新成功'
        })
      }
    })
  }
})

// 删除信息
app.delete('/delAccount', (req: Request, res) => {
  const body = req.body
  connection.query('delete from book where id = ?', [body.id], (err, _data) => {
    if (err) {
      console.log(err)
      res.json({
        code: 400,
        message: '删除失败',
        err
      })
    } else {
      res.json({
        code: 200,
        message: '删除成功'
      })
    }
  })
})

// 根据用户名获取账目列表
app.get('/getAccount', (req: Request, res) => {
  connection.query('select * from book', function (err, row) {
    if (err) {
      res.json({
        code: 400,
        message: '获取失败',
        err
      })
    } else {
      const resData = row.filter((item) => item.userName === req.auth.userName)
      resData.sort((a, b) => {
        return b.dateTime - a.dateTime
      })
      res.json({
        code: 200,
        message: '获取成功',
        data: resData
      })
    }
  })
})

// 根据用户名获取账单列表
app.get('/getAsset', (req: Request, res) => {
  connection.query('select * from asset', function (err, row) {
    if (err) {
      res.json({
        code: 400,
        message: '获取失败',
        err
      })
    } else {
      const resData = row.filter((item) => item.userName === req.auth.userName)
      res.json({
        code: 200,
        message: '获取成功',
        data: resData
      })
    }
  })
})

// 增加账户
app.post('/addAsset', (req: Request, res) => {
  const { assetName, price, assetType, dateTime, assetId, oldPrice } = req.body
  if (assetId) {
    connection.query('update asset set ?  where id = ?', [{ userName: req.auth.userName, assetName, assetType }, assetId], (err, _data) => {
      if (err) {
        res.json({
          code: 400,
          message: '修改失败',
          err
        })
      } else {
        const differencePrice = price - oldPrice
        if (differencePrice !== 0) {
          connection.query(
            'insert into book set ?',
            {
              userName: req.auth.userName,
              type: price > 0 ? 1 : 0,
              price: differencePrice,
              leaveOne: '其他',
              leaveTwo: '其他',
              remarkText: '账户修改金额',
              dateTime,
              assetId: assetId
            },
            function (err) {
              if (err) {
                res.json({
                  code: 400,
                  message: '修改失败',
                  err
                })
              } else {
                res.json({
                  code: 200,
                  message: '修改成功'
                })
              }
            }
          )
        } else {
          res.json({
            code: 200,
            message: '修改成功'
          })
        }
      }
    })
  } else {
    connection.query('insert into asset set ?', { userName: req.auth.userName, assetName, assetType }, function (err, results) {
      if (err) {
        res.json({
          code: 400,
          message: '添加失败',
          err
        })
      } else {
        connection.query(
          'insert into book set ?',
          {
            userName: req.auth.userName,
            type: price > 0 ? 1 : 0,
            price,
            leaveOne: '其他',
            leaveTwo: '其他',
            remarkText: '账户初始化金额',
            dateTime,
            assetId: results.insertId
          },
          function (err) {
            if (err) {
              res.json({
                code: 400,
                message: '添加失败',
                err
              })
            } else {
              res.json({
                code: 200,
                message: '添加成功'
              })
            }
          }
        )
      }
    })
  }
})

// 根据用户名获取账单列表
app.post('/upload', (req: Request, res) => {
  /* 生成multiparty对象，并配置上传目标路径 */
  const form = new multiparty.Form()
  // // 设置编码
  // form.encoding = 'utf-8'
  // // 设置文件存储路径，以当前编辑的文件为相对路径
  const uploadDir = './files'
  // 设置文件大小限制
  // form.maxFilesSize = 1 * 1024 * 1024;
  form.parse(req, function (_err, _fields, files) {
    console.log(files)

    try {
      const inputFile = files.file[0]
      console.log(inputFile)

      const newPath = uploadDir + '/' + inputFile.originalFilename //oldPath  不得作更改，使用默认上传路径就好
      // 同步重命名文件名 fs.renameSync(oldPath, newPath)
      fs.renameSync(inputFile.path, newPath)
      const image = fs.readFileSync(newPath).toString('base64')
      client.generalBasic(image).then(function (result) {
        console.log(result)
        res.json({ code: 200, data: result, fileName: inputFile.originalFilename })
      })
    } catch (err) {
      console.log(err)
      res.json({ data: '上传失败！' })
    }
  })
})

app.post('/upFile', (req: Request, res) => {
  const uploadDir = './files'
  const saveDir = './minFiles'

  const form = formidable({
    uploadDir: path.join(__dirname, uploadDir), // 上传文件放置的目录
    keepExtensions: true, //包含源文件的扩展名
    multiples: true //多个文件的倍数
  })
  form.parse(req, function (_err, fields, files) {
    const size = +fields.size

    try {
      const inputFile = files.file

      if (!Array.isArray(inputFile)) {
        // 文件保存位置
        const newPath = inputFile.filepath
        // 输出保存位置
        const outPath = path.join(__dirname, saveDir) + '/' + inputFile.originalFilename

        images(newPath).size(size).save(outPath)
        // 返回文件名即可
        res.json({ code: 200, data: inputFile.originalFilename })
        //   })
      }
    } catch (err) {
      console.log(err)
      res.json({ data: '上传失败！' })
    }
  })
})
//定义一个抛出错误的中间件 当token失效时 返回信息
app.use((err, _req, res, _next) => {
  if (err.name === 'UnauthorizedError') {
    return res.json({ code: 401, message: '登陆过期' })
  }
  console.log(err)

  res.json({ code: 500, message: '未知错误' })
})

// 启动服务
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
