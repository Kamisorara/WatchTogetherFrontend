<template>
  <div class="homepage-container" @mousemove="onMouseMove">
    <!-- 左侧内容 -->
    <div class="left-section">
      <!-- 左侧预留，可以根据需求添加内容 -->
    </div>

    <!-- 右侧内容 -->
    <div class="right-section">
      <a-card style="width: 350px;" hoverable>
        <a-form :model="form" layout="vertical" class="login-form" @submit="onSubmit">
          <a-form-item name="username" label="用户名" :rules="rules.username">
            <a-input placeholder="请输入用户名" v-model:value="form.username" />
          </a-form-item>
          <a-form-item name="email" label="电子邮件地址" :rules="rules.email">
            <a-input placeholder="请输入电子邮件地址" v-model:value="form.email" />
          </a-form-item>
          <a-form-item name="password" label="密码" :rules="rules.password">
            <a-input-password placeholder="请输入密码" v-model:value="form.password" />
          </a-form-item>
          <a-form-item name="passwordRepeat" label="第二次输入密码" :rules="rules.passwordRepeat">
            <a-input-password placeholder="请再次输入密码" v-model:value="form.passwordRepeat" />
          </a-form-item>
          <router-link to="/">前往登录</router-link>
          <a-form-item>
            <a-checkbox v-model:checked="form.agreeToTerms">
              已阅读并同意本网站的
              <a>《服务条款》</a> 与
              <a>《隐私政策》</a>
            </a-checkbox>
          </a-form-item>
          <a-form-item>
            <a-button type="primary" block html-type="submit" :disabled="!form.agreeToTerms">
              立即注册
            </a-button>
          </a-form-item>
        </a-form>
      </a-card>
    </div>

    <!-- 背景小球 -->
    <div class="balls">
      <div class="ball" v-for="(ball, index) in balls" :key="index"
        :style="{ top: ball.top + 'px', left: ball.left + 'px', backgroundColor: ball.color }"></div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { register } from '../api/sys/userApi';
import { notification } from 'ant-design-vue';

const router = useRouter();

const showRegisterailNotification = () => {
  notification.error({
    message: `注册失败`,
    description: '请检查输入内容是否合法',
    placement: 'topLeft',
  });
};

const showRegisterSuccessNotification = () => {
  notification.success({
    message: `注册成功`,
    description: '请前往登录',
    duration: 2,
    placement: 'topLeft',
  });
};



const form = reactive({
  email: '',
  username: '',
  password: '',
  passwordRepeat: '',
  agreeToTerms: false,
});

const rules = {
  email: [{ required: true, message: '请输入电子邮件地址', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  passwordRepeat: [{ required: true, message: '请再次输入密码', trigger: 'blur' }],
};

const balls = ref<Array<{ top: number; left: number; color: string; speedX: number; speedY: number }>>([]);

let mouseSpeed = 1;
const ballSize = 40;  // 小球的大小
const floatSpeed = 0.2; // 浮动速度，控制小球的缓慢浮动

const createBalls = () => {
  for (let i = 0; i < 20; i++) {
    balls.value.push({
      top: Math.random() * (window.innerHeight - ballSize),  // 保证小球不会超出窗口
      left: Math.random() * (window.innerWidth - ballSize),  // 保证小球不会超出窗口
      color: getRandomColor(),
      speedX: (Math.random() - 0.5) * floatSpeed,  // 小球的水平速度
      speedY: (Math.random() - 0.5) * floatSpeed,  // 小球的垂直速度
    });
  }
};

const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

const onMouseMove = (event: MouseEvent) => {
  // 调整鼠标移动时的速度，这里暂时没改变小球的运动轨迹
  mouseSpeed = Math.abs(event.movementX) + Math.abs(event.movementY) > 5 ? 1.5 : 1;
};

const updateBalls = () => {
  balls.value.forEach((ball) => {
    // 随机调整速度，保持浮动的效果
    ball.speedX += (Math.random() - 0.5) * 0.1;  // 微小变化
    ball.speedY += (Math.random() - 0.5) * 0.1;  // 微小变化

    // 使小球在水平方向上缓慢浮动
    ball.left += ball.speedX;
    ball.top += ball.speedY;

    // 防止小球越过边界，保持在窗口内
    if (ball.left <= 0) {
      ball.left = 0;
      ball.speedX = Math.abs(ball.speedX);  // 反向移动
    } else if (ball.left >= window.innerWidth - ballSize) {
      ball.left = window.innerWidth - ballSize;
      ball.speedX = -Math.abs(ball.speedX);  // 反向移动
    }

    if (ball.top <= 0) {
      ball.top = 0;
      ball.speedY = Math.abs(ball.speedY);  // 反向移动
    } else if (ball.top >= window.innerHeight - ballSize) {
      ball.top = window.innerHeight - ballSize;
      ball.speedY = -Math.abs(ball.speedY);  // 反向移动
    }
  });
};

onMounted(() => {
  createBalls();

  // 启动动画循环
  const animate = () => {
    updateBalls();
    requestAnimationFrame(animate); // 持续更新小球位置
  };
  animate();
});

const onSubmit = async (event: Event) => {
  event.preventDefault(); // 阻止默认提交行为
  try {
    const res: any = await register(form.username, form.password, form.passwordRepeat, form.email);
    console.log(res);
    if (res.success) {
      showRegisterSuccessNotification();
      setTimeout(() => {
        router.push('/');
      }, 500);
    } else {
      showRegisterailNotification();
    }
  } catch (error) {
    console.log("注册失败", error)
  }
};
</script>

<style scoped>
/* 整体容器 */
.homepage-container {
  display: flex;
  background-color: #fff5f5;
  height: 100vh;
  flex-wrap: wrap;
  position: relative;
  /* Allows positioning of balls within this container */
}

/* 左侧样式 */
.left-section {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* 右侧样式 */
.right-section {
  flex: 1;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  /* padding: 40px; */
  max-width: 500px;
  margin: 0 auto;
}

/* 背景小球 */
.balls {
  position: absolute;
  z-index: 1;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  /* Prevent interference with user interactions */
}

.ball {
  position: absolute;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  transition: all 0.1s ease;
  z-index: -1;
  /* Ensure balls are on the bottom layer */
}
</style>
