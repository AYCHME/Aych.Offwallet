const path = require('path')

const { packager } = require('../dist/index')

const RootDir = path.dirname(__dirname)

;(async () => {
  console.log('start')

  await packager.pack({
    cwd: RootDir,
    pid: '1',
    input: path.join(RootDir, 'test', 'public'),
    output: path.join(RootDir, 'test', 'create_by_test.zip'),
    host: '127.0.0.1:8080',
  })

  console.log('end')
})()
