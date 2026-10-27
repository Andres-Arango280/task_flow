pipeline {
  agent any

  environment {
    NODE_ENV = 'development'
    NPM_CONFIG_PRODUCTION = 'false'
    IMAGE_NAME = 'taskflow-backend'
    IMAGE_TAG = "${env.BUILD_NUMBER}"
    SONAR_HOST_URL = 'http://sonarqube:9000'
    SONAR_PROJECT_KEY = 'taskflow:backend'
  }

  tools {
    nodejs 'Node 20'
  }

  stages {
    stage('Checkout') {
      steps {
        echo 'Clonando repositorio...'
        checkout scm
      }
    }

    stage('Instalar dependencias') {
      steps {
        echo 'Instalando paquetes de Node...'
        sh 'npm ci'
      }
    }

    stage('Pruebas de regresión unitarias') {
      steps {
        echo 'Ejecutando pruebas unitarias del backend...'
        sh 'npm run test:regression:unit'
      }
    }

    stage('Pruebas de regresión caja negra') {
      steps {
        echo 'Ejecutando pruebas de caja negra (e2e)...'
        sh 'npm run test:regression:e2e'
      }
    }

    stage('Compilar aplicación') {
      steps {
        echo 'Compilando la app NestJS...'
        sh 'npm run build'
      }
    }

    stage('Analisis con SonarQube') {
      steps {
        echo 'Enviando analisis a SonarQube...'
        withSonarQubeEnv('SonarQube-Server') {
          sh """
            npx sonarqube-scanner \
              -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
              -Dsonar.projectName=taskflow-backend \
              -Dsonar.sources=src \
              -Dsonar.host.url=${SONAR_HOST_URL} \
              -Dsonar.token=\$SONAR_AUTH_TOKEN
          """
        }
      }
    }

    stage('Quality Gate') {
      steps {
        echo 'Esperando resultado de la Quality Gate...'
        timeout(time: 5, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true
        }
      }
    }

    stage('Construir imagen Docker') {
      steps {
        echo 'Generando imagen Docker para despliegue posterior...'
        sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
      }
    }
  }

  post {
    always {
      echo 'Pipeline finalizado.'
    }
    success {
      echo 'Todo salió bien: pruebas, SonarQube y Docker OK.'
    }
    failure {
      echo 'La pipeline falló. Revisar errores de pruebas, SonarQube o Docker.'
    }
  }
}
