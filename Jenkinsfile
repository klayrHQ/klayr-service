MYSQL_PORT = 3306
REDIS_PORT = 6381

def checkOpenPort(nPort) {
	def result = sh script: "nc -z localhost ${nPort}", returnStatus: true
	return (result == 0)
}

def runServiceIfMissing(svcName, path, nPort) {
	if (checkOpenPort(nPort) == false) {
		echo "${svcName} is not running, starting a new instance on port ${nPort}"
		dir(path) { sh "make up" }
		if (checkOpenPort(nPort) == false) {
			dir(path) { sh "make logs" }
			currentBuild.result = "FAILURE"
			throw new Exception("Failed to run ${svcName} instance")
		}
	}
}

def checkHttp(url) {
	def result = sh script: "curl -s -f -o /dev/null ${url}", returnStatus: true
	return (result == 0)
}

def waitForHttp(url) {
	waitUntil { script { return (checkHttp(url) == true) } }
}

def echoBanner(msg) {
	echo '----------------------------------------------------------------------'
	echo msg
	echo '----------------------------------------------------------------------'
}

properties([
	parameters([
		string(name: 'COMMITISH_CORE', description: 'Commit-ish of LiskHQ/lisk-core to use', defaultValue: 'development' ),
	])
])

pipeline {
	agent { node { label 'lisk-service' } }
	triggers {
		cron('0 23 * * *')
	}
	options {
		timeout(time: 10, unit: 'MINUTES')
	}
	stages {
		stage('Checkout SCM') {
			steps {
				script { echoBanner(STAGE_NAME) }
				cleanWs()
				dir('lisk-core') {
					checkout([$class: 'GitSCM', branches: [[name: "${params.COMMITISH_CORE}" ]], userRemoteConfigs: [[url: 'https://github.com/LiskHQ/lisk-core']]])
				}
				dir('lisk-service') {
					checkout scm
				}
			}
		}
		stage ('Build dependencies') {
			parallel {
				stage('Lisk Core') {
					steps {
						script { echoBanner(STAGE_NAME) }
						dir('lisk-core') {
							nvm(readFile(".nvmrc").trim()) {
								sh '''
									rm -rf ~/.lisk
									npm ci
									npm run build
								'''
							}
						}
					}
				}
				stage('Lisk Service') {
					steps {
						script { echoBanner(STAGE_NAME) }
						dir('lisk-service') {
							nvm(readFile(".nvmrc").trim()) {
								dir('./') { sh 'npm ci' }
								dir('./framework') { sh 'npm ci' }
								dir('./services/blockchain-connector') { sh 'npm ci' }
								dir('./services/blockchain-indexer') { sh 'npm ci' }
								dir('./services/blockchain-coordinator') { sh 'npm ci' }
								dir('./services/core') { sh 'npm ci' }
								dir('./services/fee-estimator') { sh 'npm ci' }
								dir('./services/market') { sh 'npm ci' }
								dir('./services/newsfeed') { sh 'npm ci' }
								dir('./services/export') { sh 'npm ci' }
								dir('./services/gateway') { sh 'npm ci' }
								dir('./services/template') { sh 'npm ci' }
								dir('./services/transaction-statistics') { sh 'npm ci' }
								dir('./tests') { sh 'npm ci' }
							}
						}
					}
				}
			}
		}
		stage('Run required services') {
			parallel {
				stage('Lisk Core') {
					steps {
						script { echoBanner(STAGE_NAME) }
						dir('lisk-core') {
							nvm(readFile(".nvmrc").trim()) {
								sh '''
									./bin/run start --network devnet --api-ipc &
									echo $! > lisk-core.pid
								'''
							}
						}
					}
				}
				stage('Lisk Service') {
					steps {
						dir('lisk-service') {
							script {
								runServiceIfMissing('MySQL', './jenkins/mysql', MYSQL_PORT)
								runServiceIfMissing('Redis', './jenkins/redis', REDIS_PORT)

								nvm(readFile(".nvmrc").trim()) {
									sh 'npm i -g pm2'
								}
							}
						}
					}	
				}
			}
		}
		stage('Run microservices') {
			steps {
				script { echoBanner(STAGE_NAME) }
				dir('lisk-service') {
					nvm(readFile(".nvmrc").trim()) {
						sh 'pm2 start --silent ecosystem.jenkins.config.js' 
					}
					waitForHttp('http://localhost:9901/api/v3/blocks')
				}
			}
		}
		stage('Run Test') {
			parallel {
				stage ('Check linting') {
					steps {
						script { echoBanner(STAGE_NAME) }
						dir('lisk-service') {
							nvm(readFile(".nvmrc").trim()) {
								sh 'npm run eslint'
							}
						}
					}
				}
				stage('Perform unit tests') {
					steps {
						script { echoBanner(STAGE_NAME) }
						nvm(readFile(".nvmrc").trim()) {
							dir('./framework') { sh "npm run test:unit" }
							dir('./services/blockchain-connector') { sh "npm run test:unit" }
							dir('./services/blockchain-indexer') { sh "npm run test:unit" }
							dir('./services/fee-estimator') { sh "npm run test:unit" }
							dir('./services/market') { sh "npm run test:unit" }
							dir('./services/newsfeed') { sh "npm run test:unit" }
							dir('./services/export') { sh "npm run test:unit" }
						}
					}
				}
			}
		}
	}
	post {
		failure {
			script { echoBanner('Failed to run the pipeline') }
			nvm(readFile(".nvmrc").trim()) {
				sh 'pm2 logs'	
			}
		}
		cleanup {
			script { echoBanner('Cleaning up...') }
			dir('lisk-service') { 
				nvm(readFile(".nvmrc").trim()) {
					sh '''
						pm2 stop --silent ecosystem.jenkins.config.js
						make clean-local
					'''
					dir('./jenkins/mysql') { sh "make down" }
					dir('./jenkins/redis') { sh "make down" }
				}
			}
			dir('lisk-core') { 
				sh '''
					kill $( cat lisk-core.pid ) || true
					rm -rf ~/.lisk node_modules
				'''
			}
		}
	}
}
// vim: filetype=groovy
