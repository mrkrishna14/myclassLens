const fs = require('fs-extra')
const path = require('path')

// Copy static files and public folder to standalone directory
async function postBuild() {
  const standaloneDir = path.join(__dirname, '..', '.next', 'standalone')
  const staticDir = path.join(__dirname, '..', '.next', 'static')
  const publicDir = path.join(__dirname, '..', 'public')
  
  console.log('Post-build: Copying static files to standalone directory...')
  
  // Copy .next/static to standalone/.next/static
  const targetStaticDir = path.join(standaloneDir, '.next', 'static')
  await fs.copy(staticDir, targetStaticDir)
  console.log('✓ Copied .next/static')
  
  // Copy public to standalone/public
  const targetPublicDir = path.join(standaloneDir, 'public')
  await fs.copy(publicDir, targetPublicDir)
  console.log('✓ Copied public folder')
  
  console.log('✓ Post-build complete!')
}

postBuild().catch(console.error)
