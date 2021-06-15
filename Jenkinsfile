pipeline {
    // 스테이지 별로 다른 거
    agent any

    triggers {
        pollSCM('*/3 * * * *')
    }

    // AWS 리소스에 접근해야 하므로 환경변수로 등록
    environment {
      AWS_ACCESS_KEY_ID = credentials('awsAccessKeyId')
      AWS_SECRET_ACCESS_KEY = credentials('awsSecretAccessKey')
      AWS_DEFAULT_REGION = 'ap-northeast-2' // 지역 설정 ( 서울로 기본값 지정 northeast = 서울 )
      HOME = '.' // Avoid npm root owned
    }

    // 파이프라인 코딩 시작
    stages {
        // 레포지토리를 다운로드 받음
        stage('Prepare') {
            agent any
            
            steps {
                echo 'Clonning Repository'

                git url: 'https://github.com/W-O-R-D/git_jenkins_pipeline_test.git',
                    branch: 'master',
                    credentialsId: 'gittest' // git에서 생성한 젠킨스에 입력한 Personal access token ID
            }

            post {
                // If Maven was able to run the tests, even if some of the test
                // failed, record the test results and archive the jar file.
                success {
                    echo 'Successfully Cloned Repository'
                }

                always {
                  echo "i tried..."
                }

                cleanup {
                  echo "after all other post condition"
                }
            }
        }
        
        // 예시용 코드
        /*
        stage('Only for production') {
          when {
            branch 'production'
            environment name: 'APP_ENV', value: 'prod'
            anyOf {
              environment name: 'DEPLOY_TO', value: 'production'
              environment name: 'DEPLOY_TO', vlaue: 'staging'
            }
          }
        }
        */


        // aws s3 에 파일을 올림  (index.html S3에 올라갔는 지 확인)
        stage('Deploy Frontend') {
          steps {
            echo 'Deploying Frontend'
            // 프론트엔드 디렉토리의 정적파일들을 S3 에 올림, 이 전에 반드시 EC2 instance profile 을 등록해야함.
            dir ('./website'){
                sh '''
                aws s3 sync ./ s3://s3jenkinstest
                '''                 // └─> 생성한 S3 의 이름 입력
              //  └─> """ 로 할 시 안먹히는 경우 있음
                /*
                    실습이라 간단히 s3 만 진행

                    실제로는 s3 얹고 클라우드 배포하고 등 프론트엔드 배포작업 처리함
                */
            }
          }

          post {
              // If Maven was able to run the tests, even if some of the test
              // failed, record the test results and archive the jar file.
              success {
                  echo 'Successfully Cloned Repository'
                  
                  // 성공 시 메일 전송 (이 기능 사용하려면 젠킨스 추가 설정 필요 - 보내는이 Credential 추가 (실습은 Google 로))
                  mail  to: 'silvercast.choi@gmail.com',
                        subject: "Deploy Frontend Success",
                        body: "Successfully deployed frontend!"

              }

              failure {
                  echo 'I failed :('

                  mail  to: 'frontalnh@gmail.com',
                        subject: "Failed Pipelinee",
                        body: "Something is wrong with deploy frontend"
              }
          }
        }
        
        // Lint : 소스 코드를 분석하여 프로그램 오류, 버그, 스타일 오류, 의심스러운 구조체에 표시(flag)를 달아놓기 위한 도구
        stage('Lint Backend') {
            // Docker plugin and Docker Pipeline 두개를 깔아야 사용가능!
            agent {
              docker {  // 새 도커 생성 후 steps 진행
                image 'node:latest'
              }
            }
            
            steps {
              dir ('./server'){
                  sh '''
                  npm install&&
                  npm run lint
                  '''           // Java 라이브러리 설치 후 Linting 
              }
            }
        }
        
        stage('Test Backend') {
          agent {
            docker {
              image 'node:latest'
            }
          }
          steps {
            echo 'Test Backend'

            dir ('./server'){
                sh '''
                npm install
                npm run test
                '''         // index.test.js 파일 돌아가게 해둠 (실습용으로 간단하게)
                            // 만약, Java 테스트 유닛을 돌릴 시 image 로 Java를 받아서 test 코드 실행
            }
          }
        }
        
        stage('Bulid Backend') {
          agent any
          steps {
            echo 'Build Backend'

            dir ('./server'){
                sh '''
                docker build . -t server --build-arg env=${PROD}
                '''   /* │                      └─> 멀티 배포 환경에서 관리하는 것을 보여주기 위한 옵션 ( --build-arg env=환경정보 )
                         └─> Docker 를 서버로 배포하기 위해 사용한 명령어 ( docker build ) 

                                        ※ 강사曰... 젠킨스 안에서 어떠한 환경인지 알려주는 것은 변수 하나로 관리하는 것이 좋다고 함
                                                    애플리케이션 레벨에서의 파라미터들을 젠킨스 파일에서 관리하는 것은 좋지 않다 생각함
                                                    
                                                    *결론 : 젠킨스 파일에서는 환경정보만 알려주고(ex - prepare 인지, production 인지 등), 
                                                            나머지 빌드 관련 파라미터들은 애플리케이션 레벨에서 
                                                            키관리 매니저(ex - AWS 파라미터 스토어)를 통해 환경에 맞는 키들을 받아서 쓰는 것 추천
                      */
            }
          }

          // 서버 빌드 실패 시 에러 출력 후 나머지 파이프라인 종료
          post {
            failure {
              error 'This pipeline stops here...'
            }
          }
        }
        

        stage('Deploy Backend') {
          agent any
          
          // 실환경에서는 이 부분에서 ECR 이나 Kubernetes 등 업데이트 진행
          // 실습에서는 패스

          steps {
            echo 'Build Backend'

            dir ('./server'){
                sh '''
                docker run -p 80:80 -d server
                '''

                /*
                sh '''
                docker rm -f $(docker ps -aq)
                docker run -p 80:80 -d server
                '''       // 기존 docker 이미지 전체 삭제 후 새 docker 실행
                          // ( 배포한 적이 없을 경우(실행 중인 docker가 없는 경우) 이 코드 실행 시 터짐 )
                */
            }
          }

          post {
            success {
              mail  to: 'silvercast.choi@gmail.com',
                    subject: "Deploy Success",
                    body: "Successfully deployed!"
                  
            }
          }
        }
    }
}
