void setBuildStatus(String message, String state) {
  step([
      $class: "GitHubCommitStatusSetter",
      reposSource: [$class: "ManuallyEnteredRepositorySource", url: "https://github.com/Easimer/trigen"],
      contextSource: [$class: "ManuallyEnteredCommitContextSource", context: "ci/jenkins/build-status"],
      errorHandlers: [[$class: "ChangingBuildStatusErrorHandler", result: "UNSTABLE"]],
      statusResultSource: [ $class: "ConditionalStatusResultSource", results: [[$class: "AnyBuildResult", message: message, state: state]] ]
  ]);
}

pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '30', artifactNumToKeepStr: '1'))
    }

    parameters {
        string(name: "DEPLOY_DIR", defaultValue: "/srv/www-data.mnt/maxwhere-turtle/", description: "Where to deploy the dev env")
    }

    stages {
        stage('Mark deployment as pending') {
            steps {
                setBuildStatus("Deployment has started", "PENDING");
            }
        }
        stage('Clean deployment directory') {
            steps {
                sh("rm -rf '${params.DEPLOY_DIR}/*'")
            }
        }
        stage('Copy files') {
            steps {
                sh("cp -v -R devenv/* '${params.DEPLOY_DIR}'")
            }
        }
    }
    post {
        success {
            setBuildStatus("Deployed", "SUCCESS");
        }
        failure {
            setBuildStatus("Deployment failed", "FAILURE");
        }
    }
}