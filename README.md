# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

# GTS Web Uygulaması

## API Endpoint Kullanımı

GTS Web uygulaması, görev kontrolünü uzaktan tetiklemek için bir API endpoint'i sunar. Bu endpoint, farklı sunucularda (örn. cPanel) çalışan cron job'lar tarafından çağrılabilir.

### Endpoint Bilgileri

- Endpoint URL: `/api/run-task-checker`
- Metod: GET
- Parametre: `key` (API anahtarı)

### Kullanım Örneği

```bash
curl "https://gts.mt-teknoloji.com/api/run-task-checker?key=gts_secure_task_key_2023"
```

### Cron Job Kurulumu (cPanel)

1. `src/api/curl-task-checker.sh` dosyasını cPanel sunucunuza yükleyin
2. Dosyayı çalıştırılabilir yapın: `chmod +x curl-task-checker.sh`
3. cPanel'de "Cron Jobs" bölümüne gidin
4. Yeni bir cron job ekleyin ve komut olarak şunu girin:
   ```
   /bin/bash /home/kullaniciadi/curl-task-checker.sh
   ```
5. Zamanlamayı ayarlayın (örn. her saat: `0 * * * *`)

### Güvenlik

- API anahtarını değiştirmek için `src/api/TaskCheckerEndpoint.ts` dosyasındaki `API_KEY` değişkenini güncelleyin
- Aynı zamanda `curl-task-checker.sh` dosyasındaki API anahtarını da güncellemeyi unutmayın

### Endpoint Yanıtları

Başarılı yanıt:
```json
{
  "success": true,
  "message": "Görev kontrolü başarıyla tamamlandı"
}
```

Hata yanıtı:
```json
{
  "success": false,
  "message": "Yetkisiz erişim"
}
```

### Diğer API Endpoint'leri

- `/api/health` - Sağlık kontrolü
- `/api/logs` - Son logları görüntüleme (API anahtarı gerektirir)

## Uygulama Bilgileri
