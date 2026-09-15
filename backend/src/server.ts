import app from './app'
import { config } from './config'

app.listen(config.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🧾 Bokföring-backend körs på http://localhost:${config.PORT} (${config.NODE_ENV})`)
})
