plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
    alias(libs.plugins.compose.compiler)
    id("maven-publish")
    id("signing")
}

android {
    namespace = "com.ditto.dittochat"
    compileSdk = 36

    defaultConfig {
        minSdk = 24

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        consumerProguardFiles("consumer-rules.pro")
        aarMetadata {
            minCompileSdk = 24
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }
    buildFeatures {
        compose = true
    }
    kotlin {
        jvmToolchain(21)
    }
    publishing {
        publishing {
            singleVariant("release") {
                withSourcesJar()
                withJavadocJar()
            }
        }
    }
}

dependencies {
    val composeBom = platform(libs.compose.bom)
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation(libs.androidx.material.icons.extended)

    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    implementation(libs.hilt.android)
    ksp(libs.hilt.android.compiler)
    implementation(libs.ditto)
    implementation(libs.gson)
    implementation(libs.androidx.lifecycle.viewmodel.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)

    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.hilt.navigation.compose)

    // Image loading
    implementation(libs.coil.compose)

    // Permissions
    implementation(libs.accompanist.permissions)

    debugImplementation(libs.androidx.ui.tooling)
}

publishing {
    publications {
        create<MavenPublication>("release") {
            groupId = "com.ditto"
            artifactId = "dittochat"
            version = System.getenv("VERSION") ?: "1.0.0"

            afterEvaluate {
                from(components["release"])
            }

            pom {
                name.set("Ditto Chat Android")
                description.set("A Ditto Chat Library for Android")
                url.set("https://github.com/getditto/DittoChat")

                scm {
                    connection.set("scm:git:git://github.com/getditto/DittoChat.git")
                    developerConnection.set("scm:git:ssh://github.com:getditto/DittoChat.git")
                    url.set("https://github.com/getditto/DittoChat/tree/main")
                }
            }
        }
    }

    repositories {
        maven {
            name = "central"
            url = uri("https://central.sonatype.com/api/v1/publisher/upload")
            credentials {
                username = findProperty("mavenCentralUsername")?.toString()
                    ?: System.getenv("ORG_GRADLE_PROJECT_mavenCentralUsername")
                password = findProperty("mavenCentralPassword")?.toString()
                    ?: System.getenv("ORG_GRADLE_PROJECT_mavenCentralPassword")
            }
        }
    }
}

signing {
    val signingKey = findProperty("signingInMemoryKey")?.toString()
        ?: System.getenv("ORG_GRADLE_PROJECT_signingInMemoryKey")
    val signingPassword = findProperty("signingInMemoryKeyPassword")?.toString()
        ?: System.getenv("ORG_GRADLE_PROJECT_signingInMemoryKeyPassword")

    if (signingKey != null && signingPassword != null) {
        useInMemoryPgpKeys(signingKey, signingPassword)
        sign(publishing.publications)
    }
}

tasks.register("publishToMavenCentral") {
    dependsOn("publishReleasePublicationToCentralRepository")
}
